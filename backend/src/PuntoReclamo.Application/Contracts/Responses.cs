namespace PuntoReclamo.Application.Contracts;

public sealed record CreateClaimResponse(string Folio, string Status, DateTime CreatedAt, DateTime DueDate);

public sealed record ClaimHistoryItemResponse(string? FromStatus, string ToStatus, string? Comment, DateTime ChangedAt);

/// <summary>Vista pública del seguimiento: no expone CI, nombre ni teléfono.</summary>
public sealed record ClaimTrackingResponse(
    string Folio,
    string ClaimType,
    string Description,
    string Status,
    DateTime CreatedAt,
    DateTime DueDate,
    DateTime? ResolvedAt,
    IReadOnlyList<ClaimHistoryItemResponse> History);

public sealed record AdminClaimResponse(
    string Folio,
    string FullName,
    string DocumentId,
    string Email,
    string? Phone,
    string ClaimType,
    string Description,
    string Status,
    DateTime CreatedAt,
    DateTime DueDate,
    DateTime? ResolvedAt,
    bool IsOverdue);

public sealed record PagedResponse<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
