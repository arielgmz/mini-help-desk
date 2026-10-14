namespace PuntoReclamo.Application.Exceptions;

/// <summary>
/// Mensaje único a propósito: no distingue entre folio inexistente y email incorrecto (anti-enumeración).
/// </summary>
public sealed class ClaimNotFoundException()
    : Exception("No se encontró el reclamo con los datos provistos.");
