using FluentValidation;
using FluentValidation.Results;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PuntoReclamo.Api.Security;

namespace PuntoReclamo.Api.Controllers;

public sealed record LoginRequest(string Username, string Password);

public sealed record LoginResponse(string AccessToken, string TokenType, DateTimeOffset ExpiresAt, string Username);

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public sealed class AuthController(AdminTokenService tokens) : ControllerBase
{
    /// <summary>Inicia sesión como administrador y devuelve un JWT para usar en <c>Authorization: Bearer</c>.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    public ActionResult<LoginResponse> Login([FromBody] LoginRequest request)
    {
        var username = request.Username?.Trim();

        var failures = new List<ValidationFailure>();
        if (string.IsNullOrEmpty(username))
        {
            failures.Add(new ValidationFailure(nameof(LoginRequest.Username), "El usuario es obligatorio."));
        }
        if (string.IsNullOrEmpty(request.Password))
        {
            failures.Add(new ValidationFailure(nameof(LoginRequest.Password), "La contraseña es obligatoria."));
        }
        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }

        // Mismo mensaje para usuario inexistente y contraseña incorrecta.
        if (!tokens.ValidateCredentials(username, request.Password))
        {
            return Problem(
                title: "Credenciales inválidas",
                detail: "Usuario o contraseña incorrectos.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        var token = tokens.CreateToken(username!);
        return new LoginResponse(token.AccessToken, "Bearer", token.ExpiresAt, username!);
    }
}

public static class RateLimitPolicies
{
    public const string Login = "login";
}
