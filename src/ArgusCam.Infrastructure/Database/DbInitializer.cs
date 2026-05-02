using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ArgusCam.Application.Common.Models.CameraProviders;
using ArgusCam.Domain.Entities.Config;
using ArgusCam.Domain.Entities.Identity;
using ArgusCam.Domain.Entities.VideoStore;
using ArgusCam.Infrastructure.Database;

namespace ArgusCam.Infrastructure.Database;

public static class InitializerExtensions
{
    public static async Task InitialiseDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();

        var initialiser = scope.ServiceProvider.GetRequiredService<DbInitializer>();

        await initialiser.InitialiseAsync();

        await initialiser.SeedAsync();
    }
}

public class DbInitializer(
    ArgusCamDbContext context,
    UserManager<User> userManager,
    RoleManager<Role> roleManager,
    ILogger<DbInitializer> logger)
{
    public async Task InitialiseAsync()
    {
        try
        {
            // Ensure SqliteDb folder exists
            var folder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "SqliteDb");
            if (!Directory.Exists(folder))
            {
                Directory.CreateDirectory(folder);
            }
            
            if (!Directory.Exists("SqliteDb"))
            {
                Directory.CreateDirectory("SqliteDb");
            }

            var pendingMigrations = await context.Database.GetPendingMigrationsAsync();
            if (pendingMigrations.Any())
            {
                await context.Database.MigrateAsync();
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while initialising the database.");
            // Don't throw, let app run (maybe DB is fine)
        }
    }

    public async Task SeedAsync()
    {
        try
        {
            await TrySeedAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }

    public async Task TrySeedAsync()
    {
        // Seed Roles
        const string adminRoleName = "Admin";
        var roles = new List<string> { adminRoleName, "User" };
        foreach (var roleName in roles)
        {
            if (await roleManager.FindByNameAsync(roleName) == null)
            {
                await roleManager.CreateAsync(new Role { Name = roleName });
            }
        }

        // Seed Default Admin User
        var adminUser = new User
        {
            UserName = "admin",
            Email = "admin@arguscam.com",
            FullName = "Admin",
            Status = true,
            CreatedOn = DateTimeOffset.UtcNow
        };

        if (userManager.Users.All(u => u.UserName != adminUser.UserName))
        {
            var createAdminResult = await userManager.CreateAsync(adminUser, "Admin123!");
            if (createAdminResult.Succeeded)
            {
                var addAdminRoleResult = await userManager.AddToRoleAsync(adminUser, adminRoleName);
                if (!addAdminRoleResult.Succeeded)
                {
                    logger.LogError(
                        "Failed to assign {RoleName} role to default admin user: {Errors}",
                        adminRoleName,
                        string.Join("; ", addAdminRoleResult.Errors.Select(e => e.Description)));
                }
            }
            else
            {
                logger.LogError(
                    "Failed to create default admin user: {Errors}",
                    string.Join("; ", createAdminResult.Errors.Select(e => e.Description)));
            }
        }

        // Default Data
        if (!context.Desks.Any())
        {
            context.Desks.AddRange(
                new Desk { Code = "DESK01", Name = "Bàn 01", Note = "Khu vực A", IsPacking = true },
                new Desk { Code = "DESK02", Name = "Bàn 02", Note = "Khu vực B", IsPacking = true }
            );
            await context.SaveChangesAsync();
        }

        // Update Cameras for testing
        if (!context.Cameras.Any())
        {
            var desk1 = await context.Desks.FirstOrDefaultAsync(d => d.Code == "DESK01");
            if (desk1 != null)
            {
                context.Cameras.Add(new Camera
                {
                    ProviderKey = CameraProviderKeys.Hikvision,
                    Code = "CAM01",
                    Name = "Camera Bàn 1",
                    CameraIP = "192.168.1.100",
                    CameraChannel = "1",
                    DeskId = desk1.Id
                });
                await context.SaveChangesAsync();
            }
        }

        // Seed ConfigApp
        if (!context.ConfigApps.Any())
        {
            context.ConfigApps.Add(new ConfigApp
            {
                //Id = 1, // Fixed ID as per legacy
                LicenseKey = "FREE-LICENSE",
                Status = "Active"
            });
            await context.SaveChangesAsync();
        }
    }
}
