using PuntoReclamo.Domain.Enums;

namespace PuntoReclamo.Domain.Exceptions;

public abstract class DomainException(string message) : Exception(message);

/// <summary>La transición solicitada no está permitida por la máquina de estados (HTTP 409).</summary>
public sealed class InvalidStatusTransitionException(ClaimStatus from, ClaimStatus to)
    : DomainException($"No se puede cambiar el estado del reclamo de '{from}' a '{to}'.")
{
    public ClaimStatus From { get; } = from;
    public ClaimStatus To { get; } = to;
}

/// <summary>Resolver o rechazar exige un comentario (HTTP 422).</summary>
public sealed class CommentRequiredException(ClaimStatus to)
    : DomainException($"El comentario es obligatorio al cambiar el estado a '{to}'.")
{
    public ClaimStatus To { get; } = to;
}
