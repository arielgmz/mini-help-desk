namespace PuntoReclamo.Application.Common;

internal static class EnumParser
{
    /// <summary>
    /// Acepta solo nombres del enum (sin distinguir mayúsculas). Rechaza valores numéricos como "1",
    /// que <see cref="Enum.TryParse{TEnum}(string?, out TEnum)"/> aceptaría.
    /// </summary>
    public static bool TryParse<T>(string? value, out T result) where T : struct, Enum
    {
        result = default;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var name = Enum.GetNames<T>()
            .FirstOrDefault(n => n.Equals(value.Trim(), StringComparison.OrdinalIgnoreCase));
        if (name is null)
        {
            return false;
        }

        result = Enum.Parse<T>(name);
        return true;
    }

    public static bool IsValid<T>(string? value) where T : struct, Enum => TryParse<T>(value, out _);

    public static string Names<T>() where T : struct, Enum => string.Join(", ", Enum.GetNames<T>());
}
