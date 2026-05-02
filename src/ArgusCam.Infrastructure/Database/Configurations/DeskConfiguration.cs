using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ArgusCam.Domain.Entities.VideoStore;

namespace ArgusCam.Infrastructure.Database.Configurations;

public class DeskConfiguration : IEntityTypeConfiguration<Desk>
{
    public void Configure(EntityTypeBuilder<Desk> builder)
    {
        builder.HasKey(x => x.Id);

        // Fix Warning 10625: Explicitly map CurrentUserId
        builder.HasOne(x => x.CurrentUser)
            .WithMany() // User can be at many desks (historically) or one? Assuming Many for now or One-to-Many
            .HasForeignKey(x => x.CurrentUserId)
            .OnDelete(DeleteBehavior.SetNull); // If user is deleted, desk becomes free

        builder.HasMany(x => x.Cameras)
            .WithOne(x => x.Desk)
            .HasForeignKey(x => x.DeskId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
