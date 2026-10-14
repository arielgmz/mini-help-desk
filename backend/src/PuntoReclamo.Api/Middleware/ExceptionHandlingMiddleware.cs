using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PuntoReclamo.Application.Exceptions;
using PuntoReclamo.Domain.Exceptions;

namespace PuntoReclamo.Api.Middleware;

/// <summary>Traduce excepciones de aplicación/dominio a respuestas ProblemDetails (RFC 7807).</summary>
public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // El cliente cortó la petición: no hay a quién responder.
            context.Response.StatusCode = 499;
        }
        catch (Exception ex)
        {
            if (context.Response.HasStarted)
            {
                throw;
            }

            var problem = Map(ex);
            problem.Instance = context.Request.Path;
            problem.Extensions["traceId"] = context.TraceIdentifier;

            if (problem.Status >= 500)
            {
                logger.LogError(ex, "Error no controlado en {Method} {Path}", context.Request.Method, context.Request.Path);
            }

            context.Response.Clear();
            context.Response.StatusCode = problem.Status!.Value;
            await Results.Json(problem, contentType: "application/problem+json", statusCode: problem.Status)
                .ExecuteAsync(context);
        }
    }

    private static ProblemDetails Map(Exception ex) => ex switch
    {
        ValidationException v => new ValidationProblemDetails(ToErrors(v))
        {
            Status = StatusCodes.Status422UnprocessableEntity,
            Title = "Error de validación",
            Detail = "Uno o más campos no son válidos.",
            Type = "https://tools.ietf.org/html/rfc4918#section-11.2"
        },
        CommentRequiredException c => new ValidationProblemDetails(new Dictionary<string, string[]>
        {
            ["comment"] = [c.Message]
        })
        {
            Status = StatusCodes.Status422UnprocessableEntity,
            Title = "Error de validación",
            Detail = c.Message,
            Type = "https://tools.ietf.org/html/rfc4918#section-11.2"
        },
        InvalidStatusTransitionException t => new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Transición de estado no permitida",
            Detail = t.Message,
            Type = "https://tools.ietf.org/html/rfc9110#section-15.5.10"
        },
        DbUpdateConcurrencyException => new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Conflicto de concurrencia",
            Detail = "El reclamo fue modificado por otra operación. Recargue e intente de nuevo.",
            Type = "https://tools.ietf.org/html/rfc9110#section-15.5.10"
        },
        ClaimNotFoundException n => new ProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "No encontrado",
            Detail = n.Message,
            Type = "https://tools.ietf.org/html/rfc9110#section-15.5.5"
        },
        BadHttpRequestException b => new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Solicitud inválida",
            Detail = "El cuerpo de la solicitud no es válido.",
            Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1"
        },
        _ => new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Error interno del servidor",
            Detail = "Ocurrió un error inesperado. Si persiste, contacte a soporte con el traceId.",
            Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1"
        }
    };

    /// <summary>Claves en camelCase para que coincidan con los nombres de campo del JSON.</summary>
    private static Dictionary<string, string[]> ToErrors(ValidationException ex) =>
        ex.Errors
            .GroupBy(e => ToCamelCase(e.PropertyName))
            .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).Distinct().ToArray());

    private static string ToCamelCase(string name) =>
        string.IsNullOrEmpty(name) ? name : char.ToLowerInvariant(name[0]) + name[1..];
}
