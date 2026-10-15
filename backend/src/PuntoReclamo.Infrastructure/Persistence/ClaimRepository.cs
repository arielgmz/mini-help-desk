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

    public async Task<ClaimPage> ListAsync(ClaimListFilter filter, int page, int pageSize, CancellationToken cancellationToken)
    {
        var now = filter.NowUtc;
        var query = db.Claims.AsNoTracking();

        if (filter.Status is { } status)
        {
            query = query.Where(c => c.Status == status);
        }

        // Vencido = no final y con fecha límite pasada (misma regla que Claim.IsOverdue).
        if (filter.OverdueOnly)
        {
            query = query.Where(c =>
                c.Status != ClaimStatus.Resuelto && c.Status != ClaimStatus.Rechazado && c.DueDate < now);
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            // 1) vencidos primero, 2) entre vencidos, el más atrasado arriba, 3) resto: más recientes primero
            .OrderByDescending(c =>
                c.Status != ClaimStatus.Resuelto && c.Status != ClaimStatus.Rechazado && c.DueDate < now)
            .ThenBy(c =>
                c.Status != ClaimStatus.Resuelto && c.Status != ClaimStatus.Rechazado && c.DueDate < now
                    ? c.DueDate
                    : DateTime.MaxValue)
            .ThenByDescending(c => c.CreatedAt)
            .ThenByDescending(c => c.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new ClaimPage(items, total);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        db.SaveChangesAsync(cancellationToken);
}
