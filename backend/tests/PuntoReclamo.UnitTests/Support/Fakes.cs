using PuntoReclamo.Application.Abstractions;
using PuntoReclamo.Domain.Entities;
using PuntoReclamo.Domain.Enums;

namespace PuntoReclamo.UnitTests.Support;

/// <summary>Secuencia en memoria con contador independiente por año.</summary>
public sealed class FakeFolioSequence : IFolioSequence
{
    private readonly Dictionary<int, int> _counters = [];

    public Task<int> NextAsync(int year, CancellationToken cancellationToken)
    {
        _counters[year] = _counters.GetValueOrDefault(year) + 1;
        return Task.FromResult(_counters[year]);
    }
}

public sealed class FakeClaimRepository : IClaimRepository
{
    public List<Claim> Claims { get; } = [];
    public int SaveCount { get; private set; }

    public Task AddAsync(Claim claim, CancellationToken cancellationToken)
    {
        Claims.Add(claim);
        return Task.CompletedTask;
    }

    public Task<Claim?> GetByFolioAsync(string folio, CancellationToken cancellationToken) =>
        Task.FromResult(Claims.FirstOrDefault(c => c.Folio == folio));

    public Task<ClaimPage> ListAsync(ClaimStatus? status, int page, int pageSize, CancellationToken cancellationToken)
    {
        var filtered = Claims.Where(c => status is null || c.Status == status).ToList();
        var items = filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return Task.FromResult(new ClaimPage(items, filtered.Count));
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        SaveCount++;
        return Task.CompletedTask;
    }
}
