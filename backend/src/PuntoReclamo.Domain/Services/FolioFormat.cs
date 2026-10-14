using System.Text.RegularExpressions;

namespace PuntoReclamo.Domain.Services;

/// <summary>Formato del folio: <c>REC-AAAA-NNNNNN</c> (ej. REC-2026-000123).</summary>
public static partial class FolioFormat
{
    public const int MaxSequence = 999_999;

    public static string Format(int year, int sequence)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(year, 1000);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(year, 9999);
        ArgumentOutOfRangeException.ThrowIfLessThan(sequence, 1);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(sequence, MaxSequence);

        return $"REC-{year:D4}-{sequence:D6}";
    }

    public static bool IsValid(string? folio) => folio is not null && FolioRegex().IsMatch(folio);

    [GeneratedRegex(@"^REC-\d{4}-\d{6}$")]
    private static partial Regex FolioRegex();
}
