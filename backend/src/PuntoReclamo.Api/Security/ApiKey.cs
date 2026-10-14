using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;

namespace PuntoReclamo.Api.Security;

public sealed class ApiKeyOptions
{
    public const string SectionName = "Admin";
    public const string HeaderName = "X-Api-Key";

    public string ApiKey { get; set; } = string.Empty;
}

/// <summary>Marca un controlador o acción como protegido por el header <c>X-Api-Key</c>.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequireApiKeyAttribute : Attribute, IAsyncAuthorizationFilter
{
    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var expected = context.HttpContext.RequestServices.GetRequiredService<IOptions<ApiKeyOptions>>().Value.ApiKey;

        if (!context.HttpContext.Request.Headers.TryGetValue(ApiKeyOptions.HeaderName, out var provided)
            || !FixedTimeEquals(provided.ToString(), expected))
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "No autorizado",
                Detail = $"Falta o es inválido el header '{ApiKeyOptions.HeaderName}'.",
                Type = "https://tools.ietf.org/html/rfc9110#section-15.5.2"
            })
            {
                StatusCode = StatusCodes.Status401Unauthorized,
                ContentTypes = { "application/problem+json" }
            };
        }

        return Task.CompletedTask;
    }

    /// <summary>Comparación en tiempo constante para no filtrar la clave por diferencias de timing.</summary>
    private static bool FixedTimeEquals(string provided, string expected)
    {
        if (string.IsNullOrEmpty(provided) || string.IsNullOrEmpty(expected))
        {
            return false;
        }

        var a = SHA256.HashData(Encoding.UTF8.GetBytes(provided));
        var b = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        return CryptographicOperations.FixedTimeEquals(a, b);
    }
}
