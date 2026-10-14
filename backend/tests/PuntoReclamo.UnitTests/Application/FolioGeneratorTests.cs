using FluentAssertions;
using Microsoft.Extensions.Time.Testing;
using PuntoReclamo.Application.Services;
using PuntoReclamo.Domain.Services;
using PuntoReclamo.UnitTests.Support;

namespace PuntoReclamo.UnitTests.Application;

public class FolioGeneratorTests
{
    private static (FolioGenerator Generator, FakeTimeProvider Clock) Create(DateTimeOffset now)
    {
        var clock = new FakeTimeProvider(now);
        return (new FolioGenerator(new FakeFolioSequence(), clock), clock);
    }

    [Fact]
    public async Task NextAsync_ProducesFormat_REC_YYYY_NNNNNN()
    {
        var (generator, _) = Create(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));

        var folio = await generator.NextAsync(CancellationToken.None);

        folio.Should().Be("REC-2026-000001");
        folio.Should().MatchRegex(@"^REC-\d{4}-\d{6}$");
        FolioFormat.IsValid(folio).Should().BeTrue();
    }

    [Fact]
    public async Task NextAsync_IsCorrelativeWithinAYear()
    {
        var (generator, _) = Create(new DateTimeOffset(2026, 3, 10, 12, 0, 0, TimeSpan.Zero));

        var folios = new List<string>();
        for (var i = 0; i < 3; i++)
        {
            folios.Add(await generator.NextAsync(CancellationToken.None));
        }

        folios.Should().Equal("REC-2026-000001", "REC-2026-000002", "REC-2026-000003");
    }

    [Fact]
    public async Task NextAsync_RestartsSequenceOnNewYear()
    {
        var (generator, clock) = Create(new DateTimeOffset(2026, 12, 31, 23, 0, 0, TimeSpan.Zero));

        var last2026 = await generator.NextAsync(CancellationToken.None);
        clock.SetUtcNow(new DateTimeOffset(2027, 1, 1, 0, 30, 0, TimeSpan.Zero));
        var first2027 = await generator.NextAsync(CancellationToken.None);

        last2026.Should().Be("REC-2026-000001");
        first2027.Should().Be("REC-2027-000001");
    }

    [Theory]
    [InlineData(2026, 123, "REC-2026-000123")]
    [InlineData(2026, 999_999, "REC-2026-999999")]
    public void Format_PadsSequenceToSixDigits(int year, int sequence, string expected) =>
        FolioFormat.Format(year, sequence).Should().Be(expected);

    [Theory]
    [InlineData(0)]
    [InlineData(1_000_000)]
    public void Format_RejectsOutOfRangeSequence(int sequence)
    {
        var act = () => FolioFormat.Format(2026, sequence);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData("REC-2026-000123", true)]
    [InlineData("rec-2026-000123", false)]
    [InlineData("REC-26-000123", false)]
    [InlineData("REC-2026-123", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsValid_ChecksFormat(string? folio, bool expected) =>
        FolioFormat.IsValid(folio).Should().Be(expected);
}
