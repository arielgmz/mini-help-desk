using PuntoReclamo.Domain.Enums;
using PuntoReclamo.Domain.Exceptions;

namespace PuntoReclamo.Domain.Services;

/// <summary>
/// Máquina de estados estricta del reclamo.
/// Recibido -> EnProceso | Rechazado; EnProceso -> Resuelto | Rechazado; Resuelto y Rechazado son finales.
/// </summary>
public static class ClaimStateMachine
{
    private static readonly IReadOnlyDictionary<ClaimStatus, ClaimStatus[]> Transitions =
        new Dictionary<ClaimStatus, ClaimStatus[]>
        {
            [ClaimStatus.Recibido] = [ClaimStatus.EnProceso, ClaimStatus.Rechazado],
            [ClaimStatus.EnProceso] = [ClaimStatus.Resuelto, ClaimStatus.Rechazado],
            [ClaimStatus.Resuelto] = [],
            [ClaimStatus.Rechazado] = []
        };

    public static bool IsFinal(ClaimStatus status) =>
        status is ClaimStatus.Resuelto or ClaimStatus.Rechazado;

    public static bool RequiresComment(ClaimStatus target) => IsFinal(target);

    public static bool CanTransition(ClaimStatus from, ClaimStatus to) =>
        Transitions.TryGetValue(from, out var allowed) && allowed.Contains(to);

    /// <exception cref="InvalidStatusTransitionException">La transición no está permitida.</exception>
    /// <exception cref="CommentRequiredException">El destino exige comentario y no se proveyó.</exception>
    public static void EnsureCanTransition(ClaimStatus from, ClaimStatus to, string? comment)
    {
        // La transición se evalúa primero: un salto ilegal es 409 aunque falte el comentario.
        if (!CanTransition(from, to))
        {
            throw new InvalidStatusTransitionException(from, to);
        }

        if (RequiresComment(to) && string.IsNullOrWhiteSpace(comment))
        {
            throw new CommentRequiredException(to);
        }
    }
}
