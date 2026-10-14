using PuntoReclamo.Application.Abstractions;
using PuntoReclamo.Domain.Services;

namespace PuntoReclamo.Application.Services;

public sealed class FolioGenerator(IFolioSequence sequence, TimeProvider clock) : IFolioGenerator
{
    public async Task<string> NextAsync(CancellationToken cancellationToken)
    {
        var year = clock.GetUtcNow().Year;
        var next = await sequence.NextAsync(year, cancellationToken);
        return FolioFormat.Format(year, next);
    }
}
