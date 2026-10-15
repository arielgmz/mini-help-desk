using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using PuntoReclamo.Api.Middleware;

namespace PuntoReclamo.UnitTests.Api;

public class InvalidRequestResponseTests
{
    private static ActionContext Context(params (string Key, string Error)[] errors)
    {
        var context = new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor());
        context.HttpContext.Request.Path = "/api/claims";
        foreach (var (key, error) in errors)
        {
            context.ModelState.AddModelError(key, error);
        }
        return context;
    }

    private static ProblemDetails Problem(IActionResult result) =>
        result.Should().BeOfType<ProblemJsonResult>().Subject.Problem;

    [Fact]
    public void MalformedJsonBody_ReturnsGeneric400_WithoutParserInternals()
    {
        var problem = Problem(InvalidRequestResponse.Create(Context(
            ("$.email", "Expected depth to be zero at the end of the JSON payload. Path: $.email | LineNumber: 0"),
            ("request", "The request field is required."))));

        problem.Status.Should().Be(400);
        problem.Title.Should().Be("Solicitud inválida");
        problem.Detail.Should().Be("El cuerpo de la solicitud no es un JSON válido o no tiene el formato esperado.");
        problem.Detail.Should().NotContain("$").And.NotContain("LineNumber");
        problem.Extensions.Should().ContainKey("traceId");
    }

    [Fact]
    public void InvalidQueryParameter_NamesOnlyThePublicParameter()
    {
        var problem = Problem(InvalidRequestResponse.Create(Context(("page", "The value 'abc' is not valid."))));

        problem.Detail.Should().Be("Valor con formato inválido en: page.");
        problem.Detail.Should().NotContain("abc");
    }
}
