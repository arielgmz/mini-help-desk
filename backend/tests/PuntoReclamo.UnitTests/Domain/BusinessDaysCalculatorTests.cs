using FluentAssertions;
using PuntoReclamo.Domain.Services;

namespace PuntoReclamo.UnitTests.Domain;

public class BusinessDaysCalculatorTests
{
    // Semana de referencia: lunes 2026-10-12 ... domingo 2026-10-18.
    [Theory]
    [InlineData("2026-10-12", DayOfWeek.Monday, "2026-10-19")]    // lunes -> lunes siguiente
    [InlineData("2026-10-14", DayOfWeek.Wednesday, "2026-10-21")] // miércoles -> miércoles siguiente
    [InlineData("2026-10-16", DayOfWeek.Friday, "2026-10-23")]    // viernes -> viernes siguiente
    [InlineData("2026-10-17", DayOfWeek.Saturday, "2026-10-23")]  // sábado -> viernes siguiente
    [InlineData("2026-10-18", DayOfWeek.Sunday, "2026-10-23")]    // domingo -> viernes siguiente
    public void AddBusinessDays_FiveDays_SkipsWeekends(string start, DayOfWeek expectedDay, string expectedDue)
    {
        var startDate = DateTime.SpecifyKind(DateTime.Parse(start), DateTimeKind.Utc);
        startDate.DayOfWeek.Should().Be(expectedDay, "la fecha de entrada debe ser el día de la semana que dice el caso");

        var due = BusinessDaysCalculator.AddBusinessDays(startDate, 5);

        due.Date.Should().Be(DateTime.Parse(expectedDue));
        BusinessDaysCalculator.IsBusinessDay(due).Should().BeTrue();
    }

    [Fact]
    public void AddBusinessDays_PreservesTimeOfDayAndKind()
    {
        var start = new DateTime(2026, 10, 14, 15, 30, 45, DateTimeKind.Utc);

        var due = BusinessDaysCalculator.AddBusinessDays(start, 5);

        due.TimeOfDay.Should().Be(start.TimeOfDay);
        due.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void AddBusinessDays_ZeroDays_ReturnsSameDate()
    {
        var start = new DateTime(2026, 10, 17, 8, 0, 0, DateTimeKind.Utc);

        BusinessDaysCalculator.AddBusinessDays(start, 0).Should().Be(start);
    }

    [Fact]
    public void AddBusinessDays_NegativeDays_Throws()
    {
        var act = () => BusinessDaysCalculator.AddBusinessDays(DateTime.UtcNow, -1);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
