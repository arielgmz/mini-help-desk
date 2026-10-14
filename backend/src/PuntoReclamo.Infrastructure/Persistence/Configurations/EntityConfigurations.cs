using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PuntoReclamo.Domain.Entities;
using PuntoReclamo.Domain.Enums;

namespace PuntoReclamo.Infrastructure.Persistence.Configurations;

public sealed class ClaimConfiguration : IEntityTypeConfiguration<Claim>
{
    public void Configure(EntityTypeBuilder<Claim> builder)
    {
        builder.ToTable("Claims");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Folio).HasMaxLength(20).IsRequired();
        builder.HasIndex(c => c.Folio).IsUnique();

        builder.Property(c => c.FullName).HasMaxLength(100).IsRequired();
        builder.Property(c => c.DocumentId).HasMaxLength(20).IsRequired();
        builder.Property(c => c.Email).HasMaxLength(254).IsRequired();
        builder.Property(c => c.Phone).HasMaxLength(15);
        builder.Property(c => c.Description).HasMaxLength(2000).IsRequired();

        builder.Property(c => c.ClaimType).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(c => c.Status).HasConversion<string>().HasMaxLength(20).IsRequired();

        builder.Property(c => c.CreatedAt).IsRequired();
        builder.Property(c => c.DueDate).IsRequired();

        // Control de concurrencia optimista: dos cambios de estado simultáneos no se pisan.
        builder.Property<byte[]>("RowVersion").IsRowVersion();

        builder.HasIndex(c => new { c.Status, c.CreatedAt });

        builder.HasMany(c => c.History)
            .WithOne()
            .HasForeignKey(h => h.ClaimId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(c => c.History)
            .HasField("_history")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public sealed class ClaimStatusHistoryConfiguration : IEntityTypeConfiguration<ClaimStatusHistory>
{
    public void Configure(EntityTypeBuilder<ClaimStatusHistory> builder)
    {
        builder.ToTable("ClaimStatusHistory");
        builder.HasKey(h => h.Id);

        builder.Property(h => h.FromStatus).HasMaxLength(20);
        builder.Property(h => h.ToStatus).HasMaxLength(20).IsRequired();
        builder.Property(h => h.Comment).HasMaxLength(1000);
        builder.Property(h => h.ChangedAt).IsRequired();

        builder.HasIndex(h => h.ClaimId);
    }
}

public sealed class FolioCounterConfiguration : IEntityTypeConfiguration<FolioCounter>
{
    public void Configure(EntityTypeBuilder<FolioCounter> builder)
    {
        builder.ToTable("FolioCounters");
        builder.HasKey(f => f.Year);
        builder.Property(f => f.Year).ValueGeneratedNever();
    }
}
