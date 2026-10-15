using FluentValidation;
using PuntoReclamo.Application.Abstractions;
using PuntoReclamo.Application.Common;
using PuntoReclamo.Application.Contracts;
using PuntoReclamo.Application.Exceptions;
using PuntoReclamo.Domain.Entities;
using PuntoReclamo.Domain.Enums;

namespace PuntoReclamo.Application.Services;

public sealed class ClaimService(
    IClaimRepository repository,
    IFolioGenerator folioGenerator,
    TimeProvider clock,
    IValidator<CreateClaimRequest> createValidator,
    IValidator<ChangeStatusRequest> changeStatusValidator,
    IValidator<ListClaimsQuery> listValidator) : IClaimService
{
    public async Task<CreateClaimResponse> CreateAsync(CreateClaimRequest request, CancellationToken cancellationToken)
    {
        var data = request.Normalize();
        await createValidator.ValidateAndThrowAsync(data, cancellationToken);

        var now = clock.GetUtcNow().UtcDateTime;
        var folio = await folioGenerator.NextAsync(cancellationToken);

        var claim = Claim.Create(
            folio,
            data.FullName,
            data.DocumentId,
            data.Email,
            data.Phone,
            EnumParser.TryParse<ClaimType>(data.ClaimType, out var type) ? type : default,
            data.Description,
            now);

        await repository.AddAsync(claim, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);

        return new CreateClaimResponse(claim.Folio, claim.Status.ToString(), claim.CreatedAt, claim.DueDate);
    }

    public async Task<ClaimTrackingResponse> GetTrackingAsync(string folio, string? email, CancellationToken cancellationToken)
    {
        var claim = await repository.GetByFolioAsync(NormalizeFolio(folio), cancellationToken);

        // Folio inexistente y email distinto producen exactamente la misma respuesta.
        if (claim is null || !claim.EmailMatches(email?.Trim()))
        {
            throw new ClaimNotFoundException();
        }

        return claim.ToTrackingResponse();
    }

    public async Task<PagedResponse<AdminClaimResponse>> ListAsync(ListClaimsQuery query, CancellationToken cancellationToken)
    {
        await listValidator.ValidateAndThrowAsync(query, cancellationToken);

        ClaimStatus? status = EnumParser.TryParse<ClaimStatus>(query.Status, out var parsed) ? parsed : null;
        // Un único "ahora" para filtrar, ordenar y marcar isOverdue: el listado es coherente consigo mismo.
        var now = clock.GetUtcNow().UtcDateTime;
        var filter = new ClaimListFilter(status, query.OverdueOnly, now);
        var page = await repository.ListAsync(filter, query.Page, query.PageSize, cancellationToken);

        var items = page.Items.Select(c => c.ToAdminResponse(now)).ToList();
        var totalPages = (int)Math.Ceiling(page.TotalCount / (double)query.PageSize);

        return new PagedResponse<AdminClaimResponse>(items, query.Page, query.PageSize, page.TotalCount, totalPages);
    }

    public async Task<AdminClaimResponse> ChangeStatusAsync(string folio, ChangeStatusRequest request, CancellationToken cancellationToken)
    {
        await changeStatusValidator.ValidateAndThrowAsync(request, cancellationToken);

        var claim = await repository.GetByFolioAsync(NormalizeFolio(folio), cancellationToken)
            ?? throw new ClaimNotFoundException();

        var target = EnumParser.TryParse<ClaimStatus>(request.Status, out var parsed) ? parsed : default;
        var now = clock.GetUtcNow().UtcDateTime;

        claim.ChangeStatus(target, request.Comment, now);
        await repository.SaveChangesAsync(cancellationToken);

        return claim.ToAdminResponse(now);
    }

    private static string NormalizeFolio(string? folio) => (folio ?? string.Empty).Trim().ToUpperInvariant();
}
