namespace PuntoReclamo.Application.Contracts;

public sealed record CreateClaimRequest(
    string FullName,
    string DocumentId,
    string Email,
    string? Phone,
    string ClaimType,
    string Description)
{
    /// <summary>Recorta espacios y convierte nulos en cadenas vacías para que los validadores trabajen sobre datos limpios.</summary>
    internal CreateClaimRequest Normalize() => new(
        FullName?.Trim() ?? string.Empty,
        DocumentId?.Trim() ?? string.Empty,
        Email?.Trim() ?? string.Empty,
        string.IsNullOrWhiteSpace(Phone) ? null : Phone.Trim(),
        ClaimType?.Trim() ?? string.Empty,
        Description?.Trim() ?? string.Empty);
}

public sealed record ChangeStatusRequest(string Status, string? Comment);

public sealed record ListClaimsQuery(string? Status, int Page = 1, int PageSize = 10);
