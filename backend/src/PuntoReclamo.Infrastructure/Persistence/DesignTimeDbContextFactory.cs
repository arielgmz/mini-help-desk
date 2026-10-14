using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PuntoReclamo.Infrastructure.Persistence;

/// <summary>Solo para `dotnet ef migrations`; no se conecta a la base al generar migraciones.</summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost,1433;Database=PuntoReclamo;User Id=sa;Password=design-time;TrustServerCertificate=True")
            .Options;
        return new AppDbContext(options);
    }
}
