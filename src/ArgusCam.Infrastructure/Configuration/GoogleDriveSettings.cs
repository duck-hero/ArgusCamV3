namespace ArgusCam.Infrastructure.Configuration;

public class GoogleDriveSettings
{
    public const string SectionName = "GoogleDrive";

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = "http://localhost:5176/api/google-drive/callback";
    public string FolderName { get; set; } = "ArgusCam";
}
