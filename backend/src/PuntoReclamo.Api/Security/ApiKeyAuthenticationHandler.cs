using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace PuntoReclamo.Api.Security;

public static class ApiKeyDefaults
{
    public const string Scheme = "ApiKey";
    public const string AdminRole = "Admin";
}

/// <summary>Autentica peticiones que traen el header <c>X-Api-Key</c> con la clave configurada.</summary>
public sealed class ApiKeyAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IOptions<ApiKeyOptions> apiKey)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(ApiKeyOptions.HeaderName, out var provided))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        if (!SecretComparer.FixedTimeEquals(provided.ToString(), apiKey.Value.ApiKey))
        {
            return Task.FromResult(AuthenticateResult.Fail("Clave de API inválida."));
        }

        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, "api-key"), new Claim(ClaimTypes.Role, ApiKeyDefaults.AdminRole)],
            Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties) =>
        ProblemResponses.UnauthorizedAsync(Context, $"Falta o es inválido el header '{ApiKeyOptions.HeaderName}'.");
}
