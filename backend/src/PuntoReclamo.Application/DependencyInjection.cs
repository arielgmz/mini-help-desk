using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using PuntoReclamo.Application.Abstractions;
using PuntoReclamo.Application.Services;

namespace PuntoReclamo.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.TryAddSingleton(TimeProvider.System);
        services.AddValidatorsFromAssemblyContaining<IClaimService>(ServiceLifetime.Singleton);
        services.AddScoped<IFolioGenerator, FolioGenerator>();
        services.AddScoped<IClaimService, ClaimService>();
        return services;
    }
}
