using System.Reflection;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Domain.Common;
using ArgusCam.Domain.Common.Interfaces;
using ArgusCam.Domain.Entities.Config;
using ArgusCam.Domain.Entities.Identity;
using ArgusCam.Domain.Entities.VideoStore;

namespace ArgusCam.Infrastructure.Database;

public class ArgusCamDbContext(DbContextOptions<ArgusCamDbContext> options) : IdentityDbContext<User, Role, Guid>(options), IApplicationDbContext
{
    public DbSet<Desk> Desks => Set<Desk>();
    public DbSet<Camera> Cameras => Set<Camera>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Video> Videos => Set<Video>();
    public DbSet<OrderCamera> OrderCameras => Set<OrderCamera>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<ConfigApp> ConfigApps => Set<ConfigApp>();
    public DbSet<GoogleDriveAccount> GoogleDriveAccounts => Set<GoogleDriveAccount>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        
        // Apply all configurations from the current assembly
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        // Fix for SQLite DateTimeOffset sorting issue
        if (Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
        {
            foreach (var entityType in builder.Model.GetEntityTypes())
            {
                var properties = entityType.ClrType.GetProperties()
                    .Where(p => p.PropertyType == typeof(DateTimeOffset)
                             || p.PropertyType == typeof(DateTimeOffset?));

                foreach (var property in properties)
                {
                    builder.Entity(entityType.Name)
                        .Property(property.Name)
                        .HasConversion<string>(); // Convert DateTimeOffset to String
                }
            }
        }

        // Global Query Filters (Soft Delete)
        builder.Entity<User>().HasQueryFilter(x => !x.IsDeleted);
        // Add other soft delete filters if needed (e.g. via generic method reflection)
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateAuditFields();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateAuditFields()
    {
        var entries = ChangeTracker.Entries<IAuditableEntity>();
        var utcNow = DateTimeOffset.UtcNow;
        // In a real app, resolve CurrentUser via a service
        string currentUser = "system"; // Placeholder

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedOn = utcNow;
                entry.Entity.CreatedBy = currentUser;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Entity.LastModifiedOn = utcNow;
                entry.Entity.LastModifiedBy = currentUser;
            }
        }
        
        // Handle Soft Delete
        var deletedEntries = ChangeTracker.Entries<ISoftDelete>().Where(e => e.State == EntityState.Deleted);
        foreach (var entry in deletedEntries)
        {
            entry.State = EntityState.Modified;
            entry.Entity.IsDeleted = true;
            entry.Entity.DeletedOn = utcNow;
            entry.Entity.DeletedBy = currentUser;
        }
    }
}
