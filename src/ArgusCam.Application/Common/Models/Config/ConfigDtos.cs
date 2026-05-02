namespace ArgusCam.Application.Common.Models.Config;

public class ConfigAppDto
{
    public long Id { get; set; }
    public string? Host { get; set; }
    public string? LicenseKey { get; set; }
    public string? GoiSuDung { get; set; }
    public string? TenKhachHang { get; set; }
    public int? SoCamera { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? Status { get; set; }
    public string? AvailablePlans { get; set; }
}

public class AppSettingsDTO
{
    public string? AccessTokenExpireTimeSpan { get; set; }
    public int TokenExpirationInMinute { get; set; }
    public string? UploadPath { get; set; }
    public bool AutoDownload { get; set; }
    public string? BaseUrl { get; set; }
    public int RefreshExpireDay { get; set; }
}

public class CameraSettingsDTO
{
    public string? Username { get; set; }
    public string? Password { get; set; }
    public int DefaultSdkPort { get; set; }
    public int RtspPort { get; set; }
}

public class EmailConfigurationDTO
{
    public string? EmailHost { get; set; }
    public int EmailPort { get; set; }
    public string? EmailUser { get; set; }
    public string? EmailPass { get; set; }
    public string? EmailFrom { get; set; }
    public string? EmailAdmin { get; set; }
}
