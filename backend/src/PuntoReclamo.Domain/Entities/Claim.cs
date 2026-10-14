using PuntoReclamo.Domain.Enums;
using PuntoReclamo.Domain.Services;

namespace PuntoReclamo.Domain.Entities;

public class Claim
{
    public const int BusinessDaysToResolve = 5;

    private readonly List<ClaimStatusHistory> _history = [];

    private Claim() { }

    public int Id { get; private set; }
    public string Folio { get; private set; } = null!;
    public string FullName { get; private set; } = null!;
    public string DocumentId { get; private set; } = null!;
    public string Email { get; private set; } = null!;
    public string? Phone { get; private set; }
    public ClaimType ClaimType { get; private set; }
    public string Description { get; private set; } = null!;
    public ClaimStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime DueDate { get; private set; }
    public DateTime? ResolvedAt { get; private set; }

    public IReadOnlyCollection<ClaimStatusHistory> History => _history;

    public static Claim Create(
        string folio,
        string fullName,
        string documentId,
        string email,
        string? phone,
        ClaimType claimType,
        string description,
        DateTime createdAtUtc)
    {
        var claim = new Claim
        {
            Folio = folio,
            FullName = fullName,
            DocumentId = documentId,
            Email = email,
            Phone = string.IsNullOrWhiteSpace(phone) ? null : phone,
            ClaimType = claimType,
            Description = description,
            Status = ClaimStatus.Recibido,
            CreatedAt = createdAtUtc,
            DueDate = BusinessDaysCalculator.AddBusinessDays(createdAtUtc, BusinessDaysToResolve)
        };

        claim._history.Add(ClaimStatusHistory.Create(null, ClaimStatus.Recibido.ToString(), null, createdAtUtc));
        return claim;
    }

    /// <exception cref="Exceptions.InvalidStatusTransitionException"/>
    /// <exception cref="Exceptions.CommentRequiredException"/>
    public void ChangeStatus(ClaimStatus target, string? comment, DateTime changedAtUtc)
    {
        ClaimStateMachine.EnsureCanTransition(Status, target, comment);

        var previous = Status;
        Status = target;

        if (ClaimStateMachine.IsFinal(target))
        {
            ResolvedAt = changedAtUtc;
        }

        _history.Add(ClaimStatusHistory.Create(previous.ToString(), target.ToString(), comment, changedAtUtc));
    }

    public bool IsOverdue(DateTime nowUtc) =>
        !ClaimStateMachine.IsFinal(Status) && DueDate < nowUtc;

    /// <summary>Comparación exacta (ordinal), según la regla de privacidad de la consulta pública.</summary>
    public bool EmailMatches(string? email) =>
        string.Equals(Email, email, StringComparison.Ordinal);
}
