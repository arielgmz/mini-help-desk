using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PuntoReclamo.Application.Abstractions;
using PuntoReclamo.Infrastructure.Persistence;

namespace PuntoReclamo.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Falta la cadena de conexión 'ConnectionStrings:DefaultConnection'.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure()));

        services.AddScoped<IClaimRepository, ClaimRepository>();
        services.AddScoped<IFolioSequence, SqlFolioSequence>();
        services.AddScoped<DbInitializer>();

        return services;
    }
}
