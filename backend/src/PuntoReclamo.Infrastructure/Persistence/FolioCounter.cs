namespace PuntoReclamo.Infrastructure.Persistence;

/// <summary>Último número de folio emitido por año.</summary>
public class FolioCounter
{
    public int Year { get; set; }
    public int LastValue { get; set; }
}
