using System.Security.Cryptography;
using System.Text;

namespace PuntoReclamo.Api.Security;

public static class SecretComparer
{
    /// <summary>
    /// Comparación en tiempo constante (sobre hashes de igual longitud) para no filtrar el secreto por timing.
    /// Un valor vacío nunca coincide.
    /// </summary>
    public static bool FixedTimeEquals(string? provided, string? expected)
    {
        if (string.IsNullOrEmpty(provided) || string.IsNullOrEmpty(expected))
        {
            return false;
        }

        var a = SHA256.HashData(Encoding.UTF8.GetBytes(provided));
        var b = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        return CryptographicOperations.FixedTimeEquals(a, b);
    }
}
