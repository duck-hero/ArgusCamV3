using Microsoft.EntityFrameworkCore;
using ArgusCam.Domain.Entities.Config;
using ArgusCam.Domain.Entities.Identity;
using ArgusCam.Domain.Entities.VideoStore;

namespace ArgusCam.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Role> Roles { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Desk> Desks { get; }
    DbSet<Camera> Cameras { get; }
    DbSet<Order> Orders { get; }
    DbSet<Video> Videos { get; }
    DbSet<OrderCamera> OrderCameras { get; }
    DbSet<ConfigApp> ConfigApps { get; }
    DbSet<GoogleDriveAccount> GoogleDriveAccounts { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
