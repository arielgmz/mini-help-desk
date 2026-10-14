using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using PuntoReclamo.Application.Abstractions;

namespace PuntoReclamo.Infrastructure.Persistence;

/// <summary>
/// Secuencia anual atómica. Un único MERGE con HOLDLOCK incrementa (o crea) el contador y devuelve el valor
/// resultante en una sola sentencia, por lo que dos peticiones concurrentes nunca reciben el mismo número.
/// Si el INSERT del reclamo falla después, el número queda "quemado" (hueco), pero jamás se duplica.
/// </summary>
public sealed class SqlFolioSequence(AppDbContext db) : IFolioSequence
{
    private const string Sql = """
        MERGE dbo.FolioCounters WITH (HOLDLOCK) AS target
        USING (SELECT @year AS [Year]) AS source ON target.[Year] = source.[Year]
        WHEN MATCHED THEN UPDATE SET LastValue = target.LastValue + 1
        WHEN NOT MATCHED THEN INSERT ([Year], LastValue) VALUES (@year, 1)
        OUTPUT inserted.LastValue;
        """;

    public async Task<int> NextAsync(int year, CancellationToken cancellationToken)
    {
        var connection = db.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = Sql;
            command.Transaction = db.Database.CurrentTransaction?.GetDbTransaction();

            var parameter = command.CreateParameter();
            parameter.ParameterName = "@year";
            parameter.DbType = DbType.Int32;
            parameter.Value = year;
            command.Parameters.Add(parameter);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt32(result);
        }
        finally
        {
            if (openedHere)
            {
                await connection.CloseAsync();
            }
        }
    }
}
