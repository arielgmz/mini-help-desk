using Microsoft.AspNetCore.Mvc;

namespace PuntoReclamo.Api.Middleware;

/// <summary>
/// Respuesta 400 cuando la petición no se puede interpretar (cuerpo que no es JSON válido, parámetro con tipo
/// incorrecto). Las reglas de negocio no pasan por aquí: esas responden 422 desde FluentValidation.
/// </summary>
public static class InvalidRequestResponse
{
    public static IActionResult Create(ActionContext context)
    {
        // Solo se nombran parámetros de query/ruta (p. ej. "page"). Las claves del cuerpo ("$.email", "request")
        // son detalles internos del deserializador y no se exponen.
        var invalidParameters = context.ModelState
            .Where(entry => entry.Value is { Errors.Count: > 0 } && IsPublicParameterName(entry.Key))
            .Select(entry => entry.Key)
            .ToArray();

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Solicitud inválida",
            Detail = invalidParameters.Length > 0
                ? $"Valor con formato inválido en: {string.Join(", ", invalidParameters)}."
                : "El cuerpo de la solicitud no es un JSON válido o no tiene el formato esperado.",
            Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
            Instance = context.HttpContext.Request.Path
        };
        problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;

        return new ProblemJsonResult(problem);
    }

    private static bool IsPublicParameterName(string key) =>
        !string.IsNullOrEmpty(key) && !key.StartsWith('$') && !key.Equals("request", StringComparison.OrdinalIgnoreCase);
}
