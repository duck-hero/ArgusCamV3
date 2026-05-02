using System.Text.Json;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Requests;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Domain.Entities.Config;
using ArgusCam.Infrastructure.Configuration;

namespace ArgusCam.Infrastructure.Services;

public class GoogleDriveService : IGoogleDriveService
{
    // drive.file: quản lý file do app tạo (non-sensitive). openid+email: lấy địa chỉ email để hiển thị tài khoản đã link.
    private static readonly string[] Scopes = [DriveService.Scope.DriveFile, "openid", "email"];

    private readonly GoogleDriveSettings _settings;
    private readonly IApplicationDbContext _context;
    private readonly IFileSettingsProvider _fileSettingsProvider;
    private readonly ILogger<GoogleDriveService> _logger;

    public GoogleDriveService(
        IOptions<GoogleDriveSettings> settings,
        IApplicationDbContext context,
        IFileSettingsProvider fileSettingsProvider,
        ILogger<GoogleDriveService> logger)
    {
        _settings = settings.Value;
        _context = context;
        _fileSettingsProvider = fileSettingsProvider;
        _logger = logger;
    }

    public string BuildAuthorizationUrl(string state)
    {
        var flow = CreateFlow();
        var request = flow.CreateAuthorizationCodeRequest(_settings.RedirectUri);
        request.State = state;
        if (request is GoogleAuthorizationCodeRequestUrl googleRequest)
        {
            googleRequest.AccessType = "offline";
            // prompt=consent đảm bảo Google luôn trả refresh_token — không có dòng này thì lần link lại sẽ
            // không có refresh_token mới và app sẽ không upload được.
            googleRequest.Prompt = "consent";
        }
        return request.Build().ToString();
    }

    public async Task<GoogleDriveAccountInfo> ExchangeCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        var flow = CreateFlow();
        TokenResponse token;
        try
        {
            token = await flow.ExchangeCodeForTokenAsync("user", code, _settings.RedirectUri, cancellationToken);
        }
        catch (TokenResponseException ex)
        {
            _logger.LogError(ex, "Google OAuth code exchange failed");
            throw new BadRequestException($"Không thể đổi mã xác thực Google: {ex.Error?.ErrorDescription ?? ex.Error?.Error ?? ex.Message}");
        }

        if (string.IsNullOrWhiteSpace(token.RefreshToken))
        {
            throw new BadRequestException("Google không trả refresh_token. Hãy vào https://myaccount.google.com/permissions xóa quyền cũ của app rồi thử liên kết lại.");
        }

        string email = await FetchUserEmailAsync(token.AccessToken, cancellationToken);

        // Remove any previous account (we support at most 1 linked account for whole app)
        var existing = await _context.GoogleDriveAccounts.ToListAsync(cancellationToken);
        foreach (var old in existing)
        {
            _context.GoogleDriveAccounts.Remove(old);
        }

        var account = new GoogleDriveAccount
        {
            Email = email,
            RefreshToken = token.RefreshToken,
            AccessToken = token.AccessToken,
            AccessTokenExpiresAt = token.IssuedUtc.AddSeconds(token.ExpiresInSeconds ?? 3600),
        };
        _context.GoogleDriveAccounts.Add(account);
        await _context.SaveChangesAsync(cancellationToken);

        // Ensure folder exists (create now or lazily on first upload). Create now to fail fast.
        try
        {
            string folderId = await EnsureFolderAsync(account, cancellationToken);
            account.FolderId = folderId;
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create Drive folder right after linking; will retry on first upload");
        }

        return new GoogleDriveAccountInfo
        {
            Email = account.Email,
            LinkedAt = account.CreatedOn,
            FolderId = account.FolderId,
        };
    }

    public async Task<GoogleDriveAccountInfo?> GetLinkedAccountAsync(CancellationToken cancellationToken = default)
    {
        var account = await _context.GoogleDriveAccounts.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        if (account == null) return null;

        return new GoogleDriveAccountInfo
        {
            Email = account.Email,
            LinkedAt = account.CreatedOn,
            FolderId = account.FolderId,
        };
    }

    public async Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        var all = await _context.GoogleDriveAccounts.ToListAsync(cancellationToken);
        if (all.Count == 0) return;
        foreach (var acc in all) _context.GoogleDriveAccounts.Remove(acc);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<DriveUploadResult> UploadVideoAsync(Guid videoId, CancellationToken cancellationToken = default)
    {
        var video = await _context.Videos.FirstOrDefaultAsync(v => v.Id == videoId, cancellationToken)
            ?? throw new NotFoundException("Video không tồn tại.");

        if (string.IsNullOrWhiteSpace(video.VideoPath))
        {
            throw new BadRequestException("Video chưa có đường dẫn file.");
        }

        // VideoPath trong DB là relative — resolve sang absolute path qua UploadPath (giống VideosController.ResolvePhysicalPath).
        string physicalPath = Path.IsPathFullyQualified(video.VideoPath)
            ? video.VideoPath
            : Path.Combine(_fileSettingsProvider.UploadPath, video.VideoPath.TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
        physicalPath = Path.GetFullPath(physicalPath);

        if (!File.Exists(physicalPath))
        {
            _logger.LogWarning("Video file not found at {PhysicalPath} (DB path: {DbPath})", physicalPath, video.VideoPath);
            throw new BadRequestException("File video không tồn tại trên máy chủ.");
        }

        var account = await _context.GoogleDriveAccounts.FirstOrDefaultAsync(cancellationToken)
            ?? throw new BadRequestException("Chưa liên kết tài khoản Google Drive.");

        string folderId = await EnsureFolderAsync(account, cancellationToken);
        if (account.FolderId != folderId)
        {
            account.FolderId = folderId;
            await _context.SaveChangesAsync(cancellationToken);
        }

        using var driveService = BuildDriveService(account);

        var metadata = new Google.Apis.Drive.v3.Data.File
        {
            Name = $"{video.Code}.mp4",
            Parents = [folderId],
        };

        await using var stream = File.OpenRead(physicalPath);
        var upload = driveService.Files.Create(metadata, stream, "video/mp4");
        upload.Fields = "id, webViewLink";

        var progress = await upload.UploadAsync(cancellationToken);
        if (progress.Status != Google.Apis.Upload.UploadStatus.Completed)
        {
            throw new InvalidOperationException($"Upload Google Drive thất bại: {progress.Exception?.Message ?? progress.Status.ToString()}");
        }

        var response = upload.ResponseBody;
        video.DriveFileId = response.Id;
        video.DriveWebViewLink = response.WebViewLink;
        video.DriveSyncedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return new DriveUploadResult
        {
            FileId = response.Id,
            WebViewLink = response.WebViewLink,
        };
    }

    private GoogleAuthorizationCodeFlow CreateFlow()
    {
        return new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new ClientSecrets
            {
                ClientId = _settings.ClientId,
                ClientSecret = _settings.ClientSecret,
            },
            Scopes = Scopes,
            DataStore = new NullDataStore(),
        });
    }

    private DriveService BuildDriveService(GoogleDriveAccount account)
    {
        var token = new TokenResponse
        {
            RefreshToken = account.RefreshToken,
            AccessToken = account.AccessToken,
            ExpiresInSeconds = 3600,
            IssuedUtc = account.AccessTokenExpiresAt?.UtcDateTime.AddSeconds(-3600) ?? DateTime.UtcNow.AddHours(-1),
        };
        var flow = CreateFlow();
        var credential = new UserCredential(flow, account.Email, token);

        return new DriveService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "ArgusCam",
        });
    }

    private async Task<string> EnsureFolderAsync(GoogleDriveAccount account, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(account.FolderId))
        {
            return account.FolderId;
        }

        using var driveService = BuildDriveService(account);

        // Search for existing folder by name (app-scope under drive.file: only sees folders app created)
        var list = driveService.Files.List();
        list.Q = $"mimeType='application/vnd.google-apps.folder' and name='{_settings.FolderName}' and trashed=false";
        list.Fields = "files(id, name)";
        list.PageSize = 10;
        var existing = await list.ExecuteAsync(cancellationToken);
        var match = existing.Files?.FirstOrDefault();
        if (match != null)
        {
            return match.Id;
        }

        var folder = new Google.Apis.Drive.v3.Data.File
        {
            Name = _settings.FolderName,
            MimeType = "application/vnd.google-apps.folder",
        };
        var createRequest = driveService.Files.Create(folder);
        createRequest.Fields = "id";
        var created = await createRequest.ExecuteAsync(cancellationToken);
        return created.Id;
    }

    private static async Task<string> FetchUserEmailAsync(string accessToken, CancellationToken cancellationToken)
    {
        using var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var res = await http.GetAsync("https://openidconnect.googleapis.com/v1/userinfo", cancellationToken);
        if (!res.IsSuccessStatusCode) return "unknown";
        using var json = JsonDocument.Parse(await res.Content.ReadAsStringAsync(cancellationToken));
        return json.RootElement.TryGetProperty("email", out var e) ? e.GetString() ?? "unknown" : "unknown";
    }

    // In-memory data store — Google SDK requires one but we persist tokens ourselves.
    private sealed class NullDataStore : IDataStore
    {
        public Task ClearAsync() => Task.CompletedTask;
        public Task DeleteAsync<T>(string key) => Task.CompletedTask;
        public Task<T?> GetAsync<T>(string key) => Task.FromResult<T?>(default);
        public Task StoreAsync<T>(string key, T value) => Task.CompletedTask;
    }
}
