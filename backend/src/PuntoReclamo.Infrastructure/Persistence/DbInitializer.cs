using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PuntoReclamo.Application.Abstractions;
using PuntoReclamo.Domain.Entities;
using PuntoReclamo.Domain.Enums;
using PuntoReclamo.Domain.Services;

namespace PuntoReclamo.Infrastructure.Persistence;

public sealed class DbInitializer(
    AppDbContext db,
    IFolioSequence folioSequence,
    TimeProvider clock,
    ILogger<DbInitializer> logger)
{
    private const int MigrationAttempts = 10;
    private const int LoginFailedErrorNumber = 18456;
    private static readonly TimeSpan MigrationDelay = TimeSpan.FromSeconds(3);

    /// <summary>Aplica migraciones; reintenta porque SQL Server en Docker tarda en aceptar conexiones.</summary>
    public async Task MigrateAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await db.Database.MigrateAsync(cancellationToken);
                return;
            }
            catch (SqlException ex) when (ex.Number == LoginFailedErrorNumber)
            {
                // Credenciales incorrectas no son un fallo transitorio: reintentar solo acumula logins fallidos,
                // y muchos hostings bloquean la IP de origen por eso.
                throw new InvalidOperationException(
                    "SQL Server rechazó el inicio de sesión (error 18456): revise usuario y contraseña en " +
                    "'ConnectionStrings:DefaultConnection'. No se reintenta para no provocar un bloqueo por intentos fallidos.",
                    ex);
            }
            catch (Exception ex) when (attempt < MigrationAttempts && !cancellationToken.IsCancellationRequested)
            {
                logger.LogWarning(ex, "Base de datos no disponible (intento {Attempt}/{Max}). Reintentando en {Delay}s...",
                    attempt, MigrationAttempts, MigrationDelay.TotalSeconds);
                await Task.Delay(MigrationDelay, cancellationToken);
            }
        }
    }

    /// <summary>Inserta datos de demostración solo si la tabla de reclamos está vacía.</summary>
    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        if (await db.Claims.AnyAsync(cancellationToken))
        {
            return;
        }

        var now = clock.GetUtcNow().UtcDateTime;

        // (nombre, CI, email, tipo, descripción, hace cuántos días se creó, transiciones [estado, comentario, días tras la creación])
        var seeds = new (string Name, string Doc, string Email, ClaimType Type, string Description, int DaysAgo, (ClaimStatus To, string? Comment, int AfterDays)[] Steps)[]
        {
            ("Ana Pérez Rojas", "4587123", "ana.perez@example.com", ClaimType.Cobros,
                "Se me cobró una comisión de mantenimiento de cuenta que no corresponde según mi contrato.", 1, []),
            ("Carlos Mamani Quispe", "6012345", "carlos.mamani@example.com", ClaimType.Producto,
                "Mi tarjeta de débito fue bloqueada sin aviso previo y no puedo realizar compras.", 12, []),
            ("Lucía Fernández", "3345678", "lucia.fernandez@example.com", ClaimType.Atencion,
                "Fui atendida de forma descortés en la agencia central y no resolvieron mi consulta.", 3,
                [(ClaimStatus.EnProceso, "Reclamo derivado al área de Atención al Cliente.", 1)]),
            ("Jorge Vargas Condori", "7788991", "jorge.vargas@example.com", ClaimType.Cobros,
                "Aparece un débito duplicado en mi extracto por una misma compra realizada el mes pasado.", 15,
                [(ClaimStatus.EnProceso, "En revisión con el área de conciliaciones.", 1)]),
            ("María Gutiérrez", "5123987", "maria.gutierrez@example.com", ClaimType.Producto,
                "El cajero automático retuvo mi tarjeta y no me fue devuelta pese a presentar mi documento.", 8,
                [(ClaimStatus.EnProceso, null, 1),
                 (ClaimStatus.Resuelto, "Se repuso la tarjeta sin costo y se entregó en agencia.", 6)]),
            ("Pedro Choque", "2456789", "pedro.choque@example.com", ClaimType.Otro,
                "Solicito la anulación de un seguro que nunca contraté y que figura en mi estado de cuenta.", 6,
                [(ClaimStatus.Rechazado, "El seguro fue contratado por canal digital con su firma electrónica.", 2)]),
            ("Sofía Limachi", "9001234", "sofia.limachi@example.com", ClaimType.Atencion,
                "La aplicación móvil no me permite realizar transferencias desde hace tres días.", 0, [])
        };

        foreach (var s in seeds)
        {
            var createdAt = now.AddDays(-s.DaysAgo);
            var year = createdAt.Year;
            var folio = FolioFormat.Format(year, await folioSequence.NextAsync(year, cancellationToken));

            var claim = Claim.Create(folio, s.Name, s.Doc, s.Email, null, s.Type, s.Description, createdAt);
            foreach (var step in s.Steps)
            {
                claim.ChangeStatus(step.To, step.Comment, createdAt.AddDays(step.AfterDays));
            }

            db.Claims.Add(claim);
        }

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Datos semilla insertados: {Count} reclamos.", seeds.Length);
    }
}
