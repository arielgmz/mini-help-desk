using FluentAssertions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Microsoft.IdentityModel.JsonWebTokens;
using PuntoReclamo.Api.Security;

namespace PuntoReclamo.UnitTests.Security;

public class AdminTokenServiceTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;

    private static JwtOptions Jwt(string key = "clave-de-pruebas-de-al-menos-32-caracteres!!") => new()
    {
        SigningKey = key,
        ExpiryMinutes = 60
    };

    private static AdminTokenService Create(FakeTimeProvider? clock = null, JwtOptions? jwt = null) => new(
        Options.Create(jwt ?? Jwt()),
        Options.Create(new AdminCredentialsOptions { Username = "admin", Password = "s3cret-Pass" }),
        clock ?? new FakeTimeProvider(Now));

    [Theory]
    [InlineData("admin", "s3cret-Pass", true)]
    [InlineData("admin", "otra", false)]
    [InlineData("otro", "s3cret-Pass", false)]
    [InlineData("ADMIN", "s3cret-Pass", false)]
    [InlineData("", "", false)]
    [InlineData(null, null, false)]
    public void ValidateCredentials_RequiresExactUserAndPassword(string? user, string? password, bool expected) =>
        Create().ValidateCredentials(user, password).Should().Be(expected);

    [Fact]
    public async Task CreateToken_ProducesValidTokenWithSubjectRoleAndExpiry()
    {
        var service = Create();

        var token = service.CreateToken("admin");
        var result = await new JsonWebTokenHandler().ValidateTokenAsync(
            token.AccessToken, AdminTokenService.CreateValidationParameters(Jwt()));

        result.IsValid.Should().BeTrue();
        result.Claims["sub"].Should().Be("admin");
        result.Claims["role"].Should().Be("Admin");
        token.ExpiresAt.Should().BeCloseTo(Now.AddMinutes(60), TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Token_SignedWithAnotherKey_IsRejected()
    {
        var forged = Create(jwt: Jwt("otra-clave-distinta-de-al-menos-32-caracteres-xx")).CreateToken("admin");

        var result = await new JsonWebTokenHandler().ValidateTokenAsync(
            forged.AccessToken, AdminTokenService.CreateValidationParameters(Jwt()));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task ExpiredToken_IsRejected()
    {
        var issuedTwoHoursAgo = Create(new FakeTimeProvider(Now.AddHours(-2))).CreateToken("admin");

        var result = await new JsonWebTokenHandler().ValidateTokenAsync(
            issuedTwoHoursAgo.AccessToken, AdminTokenService.CreateValidationParameters(Jwt()));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public async Task TamperedToken_IsRejected()
    {
        var token = Create().CreateToken("admin").AccessToken;
        var parts = token.Split('.');
        var tampered = $"{parts[0]}.{parts[1]}x.{parts[2]}";

        var result = await new JsonWebTokenHandler().ValidateTokenAsync(
            tampered, AdminTokenService.CreateValidationParameters(Jwt()));

        result.IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData("a-b-c")]
    [InlineData("iguales-pero-distinto")]
    public void FixedTimeEquals_ComparesValues(string value)
    {
        SecretComparer.FixedTimeEquals(value, value).Should().BeTrue();
        SecretComparer.FixedTimeEquals(value, value + "x").Should().BeFalse();
        SecretComparer.FixedTimeEquals(value, "").Should().BeFalse();
        SecretComparer.FixedTimeEquals(null, null).Should().BeFalse();
    }
}
