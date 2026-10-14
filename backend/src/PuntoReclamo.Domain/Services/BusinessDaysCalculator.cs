namespace PuntoReclamo.Domain.Services;

/// <summary>
/// Calcula plazos en días hábiles (lunes a viernes). No considera feriados (supuesto documentado).
/// </summary>
public static class BusinessDaysCalculator
{
    public static bool IsBusinessDay(DateTime date) =>
        date.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday);

    /// <summary>
    /// Suma <paramref name="days"/> días hábiles a <paramref name="start"/>, conservando la hora.
    /// Si <paramref name="start"/> cae en fin de semana, el primer día hábil contado es el lunes siguiente.
    /// </summary>
    public static DateTime AddBusinessDays(DateTime start, int days)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(days);

        var current = start;
        var added = 0;
        while (added < days)
        {
            current = current.AddDays(1);
            if (IsBusinessDay(current))
            {
                added++;
            }
        }

        return current;
    }
}
