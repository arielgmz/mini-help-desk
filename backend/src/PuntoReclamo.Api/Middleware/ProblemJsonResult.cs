using Microsoft.AspNetCore.Mvc;

namespace PuntoReclamo.Api.Middleware;

/// <summary>
/// Escribe un ProblemDetails como <c>application/problem+json</c> sin pasar por los formateadores de MVC:
/// un <see cref="ObjectResult"/> vería su tipo de contenido reemplazado por el <c>[Produces("application/json")]</c>
/// de los controladores, y las respuestas de error dejarían de ser consistentes con las del middleware.
/// </summary>
public sealed class ProblemJsonResult(ProblemDetails problem) : ActionResult
{
    public ProblemDetails Problem { get; } = problem;

    public override Task ExecuteResultAsync(ActionContext context)
    {
        Problem.Instance ??= context.HttpContext.Request.Path;
        Problem.Extensions.TryAdd("traceId", context.HttpContext.TraceIdentifier);

        return Results.Json(Problem, contentType: "application/problem+json", statusCode: Problem.Status)
            .ExecuteAsync(context.HttpContext);
    }
}
