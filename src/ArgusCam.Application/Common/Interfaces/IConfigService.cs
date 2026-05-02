using ArgusCam.Application.Common.Models.Config;

namespace ArgusCam.Application.Common.Interfaces;

public interface IConfigService
{
    Task<AppSettingsDTO> GetAppSettings();
    Task<EmailConfigurationDTO> GetEmailSettings();
    Task<CameraSettingsDTO> GetCameraSettings();
    Task UpdateAppSettings(AppSettingsDTO settings);
    Task UpdateEmailSettings(EmailConfigurationDTO settings);
    Task UpdateCameraSettings(CameraSettingsDTO settings);
}
