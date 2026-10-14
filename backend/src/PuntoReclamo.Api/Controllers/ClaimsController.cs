using Microsoft.AspNetCore.Mvc;
using PuntoReclamo.Application.Abstractions;
using PuntoReclamo.Application.Contracts;

namespace PuntoReclamo.Api.Controllers;

[ApiController]
[Route("api/claims")]
[Produces("application/json")]
public sealed class ClaimsController(IClaimService claims) : ControllerBase
{
    /// <summary>Registra un nuevo reclamo.</summary>
    [HttpPost]
    [ProducesResponseType<CreateClaimResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Create([FromBody] CreateClaimRequest request, CancellationToken cancellationToken)
    {
        var response = await claims.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetByFolio), new { folio = response.Folio }, response);
    }

    /// <summary>
    /// Consulta el estado de un reclamo. Folio inexistente y email incorrecto devuelven el mismo 404.
    /// </summary>
    [HttpGet("{folio}")]
    [ProducesResponseType<ClaimTrackingResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ClaimTrackingResponse>> GetByFolio(
        string folio, [FromQuery] string? email, CancellationToken cancellationToken) =>
        await claims.GetTrackingAsync(folio, email, cancellationToken);
}
