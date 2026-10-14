namespace PuntoReclamo.Domain.Entities;

public class ClaimStatusHistory
{
    private ClaimStatusHistory() { }

    public int Id { get; private set; }
    public int ClaimId { get; private set; }

    /// <summary>Nulo en la entrada inicial de registro del reclamo.</summary>
    public string? FromStatus { get; private set; }
    public string ToStatus { get; private set; } = null!;
    public string? Comment { get; private set; }
    public DateTime ChangedAt { get; private set; }

    internal static ClaimStatusHistory Create(string? fromStatus, string toStatus, string? comment, DateTime changedAtUtc) =>
        new()
        {
            FromStatus = fromStatus,
            ToStatus = toStatus,
            Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim(),
            ChangedAt = changedAtUtc
        };
}
