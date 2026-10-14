using PuntoReclamo.Application.Contracts;
using PuntoReclamo.Domain.Entities;

namespace PuntoReclamo.Application.Common;

internal static class ClaimMappings
{
    public static ClaimTrackingResponse ToTrackingResponse(this Claim claim) => new(
        claim.Folio,
        claim.ClaimType.ToString(),
        claim.Description,
        claim.Status.ToString(),
        claim.CreatedAt,
        claim.DueDate,
        claim.ResolvedAt,
        claim.History
            .OrderBy(h => h.ChangedAt)
            .ThenBy(h => h.Id)
            .Select(h => new ClaimHistoryItemResponse(h.FromStatus, h.ToStatus, h.Comment, h.ChangedAt))
            .ToList());

    public static AdminClaimResponse ToAdminResponse(this Claim claim, DateTime nowUtc) => new(
        claim.Folio,
        claim.FullName,
        claim.DocumentId,
        claim.Email,
        claim.Phone,
        claim.ClaimType.ToString(),
        claim.Description,
        claim.Status.ToString(),
        claim.CreatedAt,
        claim.DueDate,
        claim.ResolvedAt,
        claim.IsOverdue(nowUtc));
}
