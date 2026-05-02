using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ArgusCam.Domain.Entities.VideoStore;

namespace ArgusCam.Infrastructure.Database.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .IsRequired(false) // Allow User to be null (e.g. soft deleted or not assigned)
            .OnDelete(DeleteBehavior.SetNull); // If User is hard deleted, set UserId to null

        builder.HasOne(x => x.Desk)
            .WithMany()
            .HasForeignKey(x => x.DeskId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
