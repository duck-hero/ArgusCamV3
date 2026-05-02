namespace ArgusCam.Application.Common.Interfaces;

public interface IGoogleDriveService
{
    string BuildAuthorizationUrl(string state);

    Task<GoogleDriveAccountInfo> ExchangeCodeAsync(string code, CancellationToken cancellationToken = default);

    Task<GoogleDriveAccountInfo?> GetLinkedAccountAsync(CancellationToken cancellationToken = default);

    Task DisconnectAsync(CancellationToken cancellationToken = default);

    Task<DriveUploadResult> UploadVideoAsync(Guid videoId, CancellationToken cancellationToken = default);
}

public class GoogleDriveAccountInfo
{
    public string Email { get; set; } = string.Empty;
    public DateTimeOffset LinkedAt { get; set; }
    public string? FolderId { get; set; }
}

public class DriveUploadResult
{
    public string FileId { get; set; } = string.Empty;
    public string WebViewLink { get; set; } = string.Empty;
}
