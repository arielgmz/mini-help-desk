using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PuntoReclamo.Application.Abstractions;
using PuntoReclamo.Application.Contracts;

namespace PuntoReclamo.Api.Controllers;

[ApiController]
[Route("api/admin/claims")]
[Produces("application/json")]
[Authorize] // JWT (Authorization: Bearer) o clave en el header X-Api-Key
[ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
public sealed class AdminClaimsController(IClaimService claims) : ControllerBase
{
    /// <summary>Lista paginada: filtros opcionales por estado y solo vencidos (overdue=true). Los vencidos van primero.</summary>
    [HttpGet]
    [ProducesResponseType<PagedResponse<AdminClaimResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<PagedResponse<AdminClaimResponse>>> List(
        [FromQuery] string? status,
        CancellationToken cancellationToken,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] bool overdue = false) =>
        await claims.ListAsync(new ListClaimsQuery(status, page, pageSize, overdue), cancellationToken);

    /// <summary>Cambia el estado de un reclamo respetando la máquina de estados.</summary>
    [HttpPatch("{folio}/status")]
    [ProducesResponseType<AdminClaimResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AdminClaimResponse>> ChangeStatus(
        string folio, [FromBody] ChangeStatusRequest request, CancellationToken cancellationToken) =>
        await claims.ChangeStatusAsync(folio, request, cancellationToken);
}
