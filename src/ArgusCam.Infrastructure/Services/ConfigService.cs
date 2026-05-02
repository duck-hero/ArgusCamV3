using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models.Config;
using ArgusCam.Infrastructure.Configuration;
using System.Text.Json;

namespace ArgusCam.Infrastructure.Services;

public class ConfigService(
    IConfiguration configuration,
    IOptionsMonitor<AppSettings> appSettingsMonitor,
    IOptionsMonitor<CameraSettings> cameraSettingsMonitor,
    IOptionsMonitor<EmailConfiguration> emailConfigMonitor) : IConfigService
{
    private readonly string _appsettingsPath = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");

    public Task<AppSettingsDTO> GetAppSettings()
    {
        var settings = appSettingsMonitor.CurrentValue;
        var dto = new AppSettingsDTO
        {
            AccessTokenExpireTimeSpan = settings.AccessTokenExpireTimeSpan,
            TokenExpirationInMinute = settings.TokenExpirationInMinute,
            UploadPath = settings.UploadPath,
            AutoDownload = settings.AutoDownload,
            BaseUrl = settings.BaseUrl,
            RefreshExpireDay = settings.RefreshExpireDay
        };
        return Task.FromResult(dto);
    }

    public Task<CameraSettingsDTO> GetCameraSettings()
    {
        var settings = cameraSettingsMonitor.CurrentValue;
        var dto = new CameraSettingsDTO
        {
            Username = settings.Username,
            Password = settings.Password,
            DefaultSdkPort = settings.DefaultSdkPort,
            RtspPort = settings.RtspPort
        };
        return Task.FromResult(dto);
    }

    public Task<EmailConfigurationDTO> GetEmailSettings()
    {
        var settings = emailConfigMonitor.CurrentValue;
        var dto = new EmailConfigurationDTO
        {
            EmailHost = settings.EmailHost,
            EmailPort = settings.EmailPort,
            EmailUser = settings.EmailUser,
            EmailPass = settings.EmailPass,
            EmailFrom = settings.EmailFrom,
            EmailAdmin = settings.EmailAdmin
        };
        return Task.FromResult(dto);
    }

    public async Task UpdateAppSettings(AppSettingsDTO settings)
    {
        await UpdateConfigSection(AppSettings.SectionName, settings);
    }

    public async Task UpdateCameraSettings(CameraSettingsDTO settings)
    {
        if (string.IsNullOrWhiteSpace(settings.Username))
        {
            throw new BadRequestException("Camera username is required.");
        }

        if (string.IsNullOrWhiteSpace(settings.Password))
        {
            throw new BadRequestException("Camera password is required.");
        }

        if (settings.DefaultSdkPort <= 0 || settings.DefaultSdkPort > ushort.MaxValue)
        {
            throw new BadRequestException("Default SDK port is invalid.");
        }

        if (settings.RtspPort <= 0 || settings.RtspPort > ushort.MaxValue)
        {
            throw new BadRequestException("RTSP port is invalid.");
        }

        await UpdateConfigSection(CameraSettings.SectionName, settings);
    }

    public async Task UpdateEmailSettings(EmailConfigurationDTO settings)
    {
        await UpdateConfigSection(EmailConfiguration.SectionName, settings);
    }

    private async Task UpdateConfigSection(string sectionName, object settings)
    {
        var json = await File.ReadAllTextAsync(_appsettingsPath);
        var options = new JsonSerializerOptions { WriteIndented = true };

        var allConfig = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
        if (allConfig == null) return;

        var settingsJson = JsonSerializer.Serialize(settings, options);
        allConfig[sectionName] = JsonSerializer.Deserialize<Dictionary<string, object>>(settingsJson)!;

        var updatedJson = JsonSerializer.Serialize(allConfig, options);
        await File.WriteAllTextAsync(_appsettingsPath, updatedJson);

        // Reload configuration
        (configuration as IConfigurationRoot)?.Reload();
    }
}
