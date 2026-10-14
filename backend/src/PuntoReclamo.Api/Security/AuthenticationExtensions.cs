using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace PuntoReclamo.Api.Security;

public static class AuthenticationExtensions
{
    public const string AdminScheme = "Admin";

    /// <summary>
    /// Endpoints admin: aceptan <c>Authorization: Bearer &lt;JWT&gt;</c> (panel web) o <c>X-Api-Key</c> (requisito base).
    /// Un esquema "política" elige el correcto según los headers de la petición.
    /// </summary>
    public static IServiceCollection AddAdminAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<ApiKeyOptions>()
            .Bind(configuration.GetSection(ApiKeyOptions.SectionName))
            .Validate(o => !string.IsNullOrWhiteSpace(o.ApiKey), "Falta configurar 'Admin:ApiKey'.")
            .ValidateOnStart();

        services.AddOptions<AdminCredentialsOptions>()
            .Bind(configuration.GetSection(AdminCredentialsOptions.SectionName))
            .Validate(
                o => !string.IsNullOrWhiteSpace(o.Username) && !string.IsNullOrWhiteSpace(o.Password),
                "Faltan 'Admin:Username' y 'Admin:Password' (credenciales del panel).")
            .ValidateOnStart();

        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(
                o => Encoding.UTF8.GetByteCount(o.SigningKey ?? string.Empty) >= JwtOptions.MinSigningKeyBytes,
                $"'Jwt:SigningKey' debe tener al menos {JwtOptions.MinSigningKeyBytes} caracteres y definirse por configuración.")
            .Validate(o => o.ExpiryMinutes is >= 1 and <= 1440, "'Jwt:ExpiryMinutes' debe estar entre 1 y 1440.")
            .ValidateOnStart();

        services.AddSingleton<AdminTokenService>();

        services
            .AddAuthentication(options =>
            {
                options.DefaultScheme = AdminScheme;
                options.DefaultChallengeScheme = AdminScheme;
            })
            .AddPolicyScheme(AdminScheme, "Bearer o X-Api-Key", options =>
            {
                options.ForwardDefaultSelector = context =>
                    context.Request.Headers.ContainsKey(ApiKeyOptions.HeaderName)
                        ? ApiKeyDefaults.Scheme
                        : JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.Events = new JwtBearerEvents
                {
                    OnChallenge = context =>
                    {
                        context.HandleResponse();
                        context.Response.Headers.WWWAuthenticate = JwtBearerDefaults.AuthenticationScheme;

                        var detail = context.AuthenticateFailure is SecurityTokenExpiredException
                            ? "La sesión expiró. Inicie sesión nuevamente."
                            : $"Autenticación requerida: envíe un token Bearer o el header '{ApiKeyOptions.HeaderName}'.";
                        return ProblemResponses.UnauthorizedAsync(context.HttpContext, detail);
                    }
                };
            })
            .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(ApiKeyDefaults.Scheme, _ => { });

        // Los parámetros de validación se leen de IOptions<JwtOptions> (ya validadas) en vez de capturar valores al registrar.
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((bearer, jwt) =>
                bearer.TokenValidationParameters = AdminTokenService.CreateValidationParameters(jwt.Value));

        services.AddAuthorization();
        return services;
    }
}
