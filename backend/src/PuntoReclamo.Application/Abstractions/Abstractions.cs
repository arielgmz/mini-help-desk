using PuntoReclamo.Application.Contracts;
using PuntoReclamo.Domain.Entities;
using PuntoReclamo.Domain.Enums;

namespace PuntoReclamo.Application.Abstractions;

public sealed record ClaimPage(IReadOnlyList<Claim> Items, int TotalCount);

public interface IClaimRepository
{
    Task AddAsync(Claim claim, CancellationToken cancellationToken);

    /// <summary>Devuelve el reclamo con su historial, rastreado para poder modificarlo.</summary>
    Task<Claim?> GetByFolioAsync(string folio, CancellationToken cancellationToken);

    Task<ClaimPage> ListAsync(ClaimStatus? status, int page, int pageSize, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Secuencia correlativa por año. La implementación debe ser atómica ante concurrencia
/// (dos llamadas simultáneas nunca devuelven el mismo número).
/// </summary>
public interface IFolioSequence
{
    Task<int> NextAsync(int year, CancellationToken cancellationToken);
}

public interface IFolioGenerator
{
    Task<string> NextAsync(CancellationToken cancellationToken);
}

public interface IClaimService
{
    Task<CreateClaimResponse> CreateAsync(CreateClaimRequest request, CancellationToken cancellationToken);

    /// <exception cref="Exceptions.ClaimNotFoundException">Folio inexistente o email no coincidente (misma respuesta).</exception>
    Task<ClaimTrackingResponse> GetTrackingAsync(string folio, string? email, CancellationToken cancellationToken);

    Task<PagedResponse<AdminClaimResponse>> ListAsync(ListClaimsQuery query, CancellationToken cancellationToken);

    Task<AdminClaimResponse> ChangeStatusAsync(string folio, ChangeStatusRequest request, CancellationToken cancellationToken);
}
