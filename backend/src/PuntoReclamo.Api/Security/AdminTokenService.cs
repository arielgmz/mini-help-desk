using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace PuntoReclamo.Api.Security;

public sealed record AdminToken(string AccessToken, DateTimeOffset ExpiresAt);

public sealed class AdminTokenService(
    IOptions<JwtOptions> jwtOptions,
    IOptions<AdminCredentialsOptions> credentials,
    TimeProvider clock)
{
    private readonly JsonWebTokenHandler _handler = new();

    /// <summary>Verifica usuario y contraseña sin cortocircuito, para no revelar cuál de los dos falló por timing.</summary>
    public bool ValidateCredentials(string? username, string? password)
    {
        var userOk = SecretComparer.FixedTimeEquals(username, credentials.Value.Username);
        var passwordOk = SecretComparer.FixedTimeEquals(password, credentials.Value.Password);
        return userOk & passwordOk;
    }

    public AdminToken CreateToken(string username)
    {
        var options = jwtOptions.Value;
        var now = clock.GetUtcNow();
        var expires = now.AddMinutes(options.ExpiryMinutes);

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = options.Issuer,
            Audience = options.Audience,
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expires.UtcDateTime,
            Claims = new Dictionary<string, object>
            {
                ["sub"] = username,
                ["role"] = ApiKeyDefaults.AdminRole
            },
            SigningCredentials = new SigningCredentials(CreateKey(options), SecurityAlgorithms.HmacSha256)
        };

        return new AdminToken(_handler.CreateToken(descriptor), expires);
    }

    public static SymmetricSecurityKey CreateKey(JwtOptions options) =>
        new(Encoding.UTF8.GetBytes(options.SigningKey));

    public static TokenValidationParameters CreateValidationParameters(JwtOptions options) => new()
    {
        ValidateIssuer = true,
        ValidIssuer = options.Issuer,
        ValidateAudience = true,
        ValidAudience = options.Audience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = CreateKey(options),
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        ValidateLifetime = true,
        RequireExpirationTime = true,
        ClockSkew = TimeSpan.FromSeconds(30),
        NameClaimType = "sub",
        RoleClaimType = "role"
    };
}
