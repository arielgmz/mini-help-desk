using Microsoft.AspNetCore.Mvc;

namespace PuntoReclamo.Api.Security;

/// <summary>Respuestas ProblemDetails escritas desde componentes fuera de MVC (autenticación, rate limiter).</summary>
internal static class ProblemResponses
{
    public static Task WriteAsync(HttpContext context, int status, string title, string detail, string type)
    {
        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Type = type,
            Instance = context.Request.Path
        };
        problem.Extensions["traceId"] = context.TraceIdentifier;

        context.Response.StatusCode = status;
        return Results.Json(problem, contentType: "application/problem+json", statusCode: status).ExecuteAsync(context);
    }

    public static Task UnauthorizedAsync(HttpContext context, string detail) =>
        WriteAsync(context, StatusCodes.Status401Unauthorized, "No autorizado", detail,
            "https://tools.ietf.org/html/rfc9110#section-15.5.2");

    public static Task TooManyRequestsAsync(HttpContext context, string detail) =>
        WriteAsync(context, StatusCodes.Status429TooManyRequests, "Demasiados intentos", detail,
            "https://tools.ietf.org/html/rfc6585#section-4");
}
