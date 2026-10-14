using Microsoft.EntityFrameworkCore;
using PuntoReclamo.Application.Abstractions;
using PuntoReclamo.Domain.Entities;
using PuntoReclamo.Domain.Enums;

namespace PuntoReclamo.Infrastructure.Persistence;

public sealed class ClaimRepository(AppDbContext db) : IClaimRepository
{
    public async Task AddAsync(Claim claim, CancellationToken cancellationToken) =>
        await db.Claims.AddAsync(claim, cancellationToken);

    public Task<Claim?> GetByFolioAsync(string folio, CancellationToken cancellationToken) =>
        db.Claims
            .Include(c => c.History)
            .FirstOrDefaultAsync(c => c.Folio == folio, cancellationToken);

    public async Task<ClaimPage> ListAsync(ClaimStatus? status, int page, int pageSize, CancellationToken cancellationToken)
    {
        var query = db.Claims.AsNoTracking();
        if (status is not null)
        {
            query = query.Where(c => c.Status == status);
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .ThenByDescending(c => c.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new ClaimPage(items, total);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        db.SaveChangesAsync(cancellationToken);
}
