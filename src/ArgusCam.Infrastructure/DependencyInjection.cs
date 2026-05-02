using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Domain.Entities.Identity;
using Hangfire;
using Hangfire.MemoryStorage;
using ArgusCam.Infrastructure.Authentication;
using ArgusCam.Infrastructure.CameraProviders;
using ArgusCam.Infrastructure.CameraProviders.HikVision;
using ArgusCam.Infrastructure.Configuration;
using ArgusCam.Infrastructure.Database;
using ArgusCam.Infrastructure.HikVision;
using ArgusCam.Infrastructure.HikVision.Native;
using ArgusCam.Infrastructure.Services;
using System.Security.Claims;
using System.Text;

namespace ArgusCam.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<ArgusCamDbContext>(options =>
            options.UseSqlite(connectionString));

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ArgusCamDbContext>());

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        services.AddIdentityCore<User>()
            .AddRoles<Role>()
            .AddEntityFrameworkStores<ArgusCamDbContext>();

        services.AddScoped<DbInitializer>();

        // JWT Configuration
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();

        // Config Services
        services.Configure<AppSettings>(configuration.GetSection(AppSettings.SectionName));
        services.Configure<CameraSettings>(configuration.GetSection(CameraSettings.SectionName));
        services.Configure<EmailConfiguration>(configuration.GetSection(EmailConfiguration.SectionName));
        services.AddScoped<IConfigService, ConfigService>();

        // File & QR Services
        var fileSettings = new FileSettings();
        configuration.Bind(FileSettings.SectionName, fileSettings);
        services.AddSingleton(Microsoft.Extensions.Options.Options.Create(fileSettings));
        services.AddSingleton<IFileSettingsProvider>(fileSettings);
        services.AddScoped<IFileService, FileService>();
        services.AddScoped<ICameraProvider, HikVisionCameraProvider>();
        services.AddScoped<ICameraProviderFactory, CameraProviderFactory>();
        services.AddScoped<IVideoService, VideoService>();
        services.AddScoped<IVideoDownloadService, VideoDownloadService>();
        services.AddScoped<IVideoProgressNotifier, VideoProgressNotifier>();
        services.AddScoped<IEmailService, MockEmailService>();
        services.AddScoped<ISchedulerService, SchedulerService>();

        // HikVision Hardware Scan (Singleton because SDK init once + scan lock)
        services.Configure<HikVisionSettings>(configuration.GetSection(HikVisionSettings.SectionName));
        services.AddSingleton<IHardwareScanService, HardwareScanService>();

        // Go2RTC Service (Singleton because it manages a Process)
        services.AddSingleton<Go2RtcService>();
        services.AddSingleton<IGo2RtcService>(provider => provider.GetRequiredService<Go2RtcService>());
        services.AddHostedService<Go2RtcCleanupBackgroundService>();

        // Google Drive integration
        services.Configure<GoogleDriveSettings>(configuration.GetSection(GoogleDriveSettings.SectionName));
        services.AddScoped<IGoogleDriveService, GoogleDriveService>();

        // Hangfire
        services.AddHangfire(config => config
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseMemoryStorage());

        services.AddHangfireServer();

        services.AddAuthentication(defaultScheme: JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = JwtSettings.Issuer,
                    ValidAudience = JwtSettings.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(JwtSettings.Secret))
                };

                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var userIdValue = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
                            ?? context.Principal?.FindFirstValue("sub");
                        var sessionId = context.Principal?.FindFirstValue(JwtTokenGenerator.SessionClaimType);

                        if (!Guid.TryParse(userIdValue, out var userId) || string.IsNullOrWhiteSpace(sessionId))
                        {
                            context.Fail("Invalid login session.");
                            return;
                        }

                        var dbContext = context.HttpContext.RequestServices.GetRequiredService<ArgusCamDbContext>();
                        var currentSessionId = await dbContext.Users
                            .Where(x => x.Id == userId)
                            .Select(x => x.CurrentSessionId)
                            .FirstOrDefaultAsync();

                        if (string.IsNullOrWhiteSpace(currentSessionId) ||
                            !string.Equals(currentSessionId, sessionId, StringComparison.Ordinal))
                        {
                            context.Fail("This login session is no longer active.");
                        }
                    }
                };
            });
            
        return services;
    }
}
