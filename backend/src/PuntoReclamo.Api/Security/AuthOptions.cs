namespace PuntoReclamo.Api.Security;

/// <summary>Clave estática para el header <c>X-Api-Key</c> (requisito base del alcance).</summary>
public sealed class ApiKeyOptions
{
    public const string SectionName = "Admin";
    public const string HeaderName = "X-Api-Key";

    public string ApiKey { get; set; } = string.Empty;
}

/// <summary>Credenciales de la persona administradora para iniciar sesión y obtener un JWT.</summary>
public sealed class AdminCredentialsOptions
{
    public const string SectionName = "Admin";

    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    public const int MinSigningKeyBytes = 32;

    public string Issuer { get; set; } = "PuntoReclamo";
    public string Audience { get; set; } = "PuntoReclamo.Admin";

    /// <summary>Secreto HMAC. Solo por configuración/variables de entorno, nunca en el código ni en el repositorio.</summary>
    public string SigningKey { get; set; } = string.Empty;

    public int ExpiryMinutes { get; set; } = 60;
}
