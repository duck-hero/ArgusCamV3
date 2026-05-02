using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Infrastructure.Database.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .IsRequired(false) // Allow null User to avoid Global Query Filter warning
            .OnDelete(DeleteBehavior.Cascade); // Delete tokens if user is deleted
    }
}
