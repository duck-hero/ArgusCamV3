namespace ArgusCam.Infrastructure.Configuration;

public class CameraSettings
{
    public const string SectionName = "CameraSettings";

    public string Username { get; set; } = "admin";
    public string Password { get; set; } = string.Empty;
    public int DefaultSdkPort { get; set; } = 8000;
    public int RtspPort { get; set; } = 554;
}
