using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;
using ArgusCam.Application.Features.Videos.Commands.DownloadOrderVideos;
using ArgusCam.Application.Features.Videos.Queries.GetVideos;

namespace ArgusCam.Api.Controllers.VideoStore;

/// <summary>
/// Controller quan ly Video.
/// </summary>
[Route("api/videos")]
public class VideosController(
    IApplicationDbContext dbContext,
    IFileSettingsProvider fileSettingsProvider,
    ILogger<VideosController> logger) : ApiController
{
    private static readonly FileExtensionContentTypeProvider ContentTypeProvider = new();
    private const string ThumbnailMimeType = "image/jpeg";

    /// <summary>
    /// Lay danh sach Video (khong phan trang).
    /// Co the loc theo OrderId hoac trang thai dong goi.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ResponseData>> GetAll([FromQuery] GetVideosQuery query)
    {
        var result = await Mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// API chuyen dung de tai video theo orderId.
    /// Endpoint nay nhan orderId tu URL, sau do day command vao MediatR.
    /// Toan bo xu ly nang (tim camera qua OrderCamera, tai video va convert) se chay nen qua Hangfire.
    /// </summary>
    /// <param name="orderId">Id don hang can kich hoat tai video.</param>
    /// <returns>
    /// Tra ve phan hoi ngay sau khi job duoc enqueue de client khong can cho qua trinh tai video hoan tat.
    /// </returns>
    [HttpPost("download-by-order/{orderId:guid}")]
    public async Task<ActionResult<ResponseData>> DownloadByOrderId([FromRoute] Guid orderId)
    {
        var command = new DownloadOrderVideosCommand { OrderId = orderId };
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Stream video theo id de frontend co the phat truc tiep.
    /// </summary>
    [HttpGet("{id:guid}/stream")]
    public async Task<IActionResult> StreamById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var videoPath = await dbContext.Videos
                .AsNoTracking()
                .Where(v => v.Id == id)
                .Select(v => v.VideoPath)
                .FirstOrDefaultAsync(cancellationToken);

            if (string.IsNullOrWhiteSpace(videoPath))
            {
                return NotFound(new ResponseData { Err = "Video not found." });
            }

            var physicalVideoPath = ResolvePhysicalPath(videoPath);

            if (!System.IO.File.Exists(physicalVideoPath))
            {
                return NotFound(new ResponseData { Err = "Video file not found on server." });
            }

            if (!ContentTypeProvider.TryGetContentType(physicalVideoPath, out var contentType))
            {
                contentType = "video/mp4";
            }

            return PhysicalFile(physicalVideoPath, contentType, enableRangeProcessing: true);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            logger.LogInformation("Video stream request was cancelled by the client for video {VideoId}.", id);
            return new EmptyResult();
        }
    }

    /// <summary>
    /// Lay thumbnail dai dien cho video. Chi stream khi user bam play.
    /// </summary>
    [HttpGet("{id:guid}/thumbnail")]
    public async Task<IActionResult> GetThumbnail([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var videoInfo = await dbContext.Videos
                .AsNoTracking()
                .Where(v => v.Id == id)
                .Select(v => new
                {
                    v.Code,
                    v.VideoPath
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (videoInfo is null || string.IsNullOrWhiteSpace(videoInfo.VideoPath))
            {
                return NotFound(new ResponseData { Err = "Video not found." });
            }

            var physicalVideoPath = ResolvePhysicalPath(videoInfo.VideoPath);
            if (!System.IO.File.Exists(physicalVideoPath))
            {
                return File(BuildThumbnailPlaceholder(videoInfo.Code), "image/svg+xml");
            }

            var thumbnailPath = GetThumbnailPath(physicalVideoPath);
            var thumbnailReady = await EnsureThumbnailAsync(physicalVideoPath, thumbnailPath, cancellationToken);

            if (thumbnailReady)
            {
                Response.Headers.CacheControl = "public,max-age=86400";
                return PhysicalFile(thumbnailPath, ThumbnailMimeType);
            }

            return File(BuildThumbnailPlaceholder(videoInfo.Code), "image/svg+xml");
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            logger.LogInformation("Video thumbnail request was cancelled by the client for video {VideoId}.", id);
            return new EmptyResult();
        }
    }

    /// <summary>
    /// DTO upload video tu external client.
    /// </summary>
    public class UploadVideoDto
    {
        public IFormFile[] Videos { set; get; } = [];
        public Guid OrderId { set; get; }
        public string? CameraCode { get; set; }
        public bool IsPacking { get; set; }
    }

    /// <summary>
    /// Upload video tu external client.
    /// Luu file vao UploadPath/{CameraCode}/ va tao record Video trong DB.
    /// </summary>
    [HttpPost("upload")]
    [DisableRequestSizeLimit]
    [RequestFormLimits(MultipartBodyLengthLimit = long.MaxValue)]
    public async Task<ActionResult<ResponseData>> Upload(
        [FromForm] UploadVideoDto input,
        CancellationToken cancellationToken)
    {
        if (input.Videos.Length == 0)
        {
            return BadRequest(new ResponseData { Err = "No video files provided." });
        }

        // Verify order exists
        var orderExists = await dbContext.Orders
            .AnyAsync(o => o.Id == input.OrderId, cancellationToken);
        if (!orderExists)
        {
            return NotFound(new ResponseData { Err = $"Order {input.OrderId} not found." });
        }

        // Resolve camera
        var cameraCode = input.CameraCode?.Trim();
        Guid? cameraId = null;
        if (!string.IsNullOrWhiteSpace(cameraCode))
        {
            cameraId = await dbContext.Cameras
                .AsNoTracking()
                .Where(c => c.Code == cameraCode)
                .Select(c => c.Id)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var savedVideos = new List<object>();

        foreach (var file in input.Videos)
        {
            if (file.Length <= 0)
            {
                continue;
            }

            // Save file: UploadPath/{ddMMyyyy}/{filename} — dong bo voi logic tai thu cong
            var subFolder = DateTime.Now.ToString("ddMMyyyy");
            var folder = Path.Combine(fileSettingsProvider.UploadPath, subFolder);
            Directory.CreateDirectory(folder);

            var safeFileName = Path.GetFileName(file.FileName);
            var fullPath = Path.Combine(folder, safeFileName);

            // Avoid overwrite: append guid if file exists
            if (System.IO.File.Exists(fullPath))
            {
                var name = Path.GetFileNameWithoutExtension(safeFileName);
                var ext = Path.GetExtension(safeFileName);
                fullPath = Path.Combine(folder, $"{name}_{Guid.NewGuid():N}{ext}");
            }

            await using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream, cancellationToken);
            }

            // Store relative path in DB
            var relativePath = Path.GetRelativePath(fileSettingsProvider.UploadPath, fullPath);

            var video = new ArgusCam.Domain.Entities.VideoStore.Video
            {
                Code = $"{cameraCode}-{Guid.NewGuid().ToString("N")[..8]}",
                VideoPath = relativePath,
                Note = "Uploaded from external client",
                CreatedBy = "ExternalClient",
                IsConverted = false,
                IsPacking = input.IsPacking,
                OrderId = input.OrderId,
                CameraId = cameraId
            };

            dbContext.Videos.Add(video);
            savedVideos.Add(new { video.Id, video.Code, video.VideoPath });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Uploaded {Count} video(s) for order {OrderId}, camera {CameraCode}",
            savedVideos.Count, input.OrderId, cameraCode);

        return Ok(new ResponseData { Content = savedVideos });
    }

    private string ResolvePhysicalPath(string path)
    {
        var physicalPath = path;
        if (!Path.IsPathFullyQualified(physicalPath))
        {
            var relativePath = physicalPath.TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            physicalPath = Path.Combine(fileSettingsProvider.UploadPath, relativePath);
        }

        return Path.GetFullPath(physicalPath);
    }

    private static string GetThumbnailPath(string physicalVideoPath)
    {
        var directory = Path.GetDirectoryName(physicalVideoPath)
            ?? throw new InvalidOperationException("Video path has no directory.");
        var thumbnailDirectory = Path.Combine(directory, ".thumbnails");
        Directory.CreateDirectory(thumbnailDirectory);

        return Path.Combine(
            thumbnailDirectory,
            $"{Path.GetFileNameWithoutExtension(physicalVideoPath)}.jpg");
    }

    private async Task<bool> EnsureThumbnailAsync(
        string physicalVideoPath,
        string thumbnailPath,
        CancellationToken cancellationToken)
    {
        if (System.IO.File.Exists(thumbnailPath))
        {
            var thumbnailLastWrite = System.IO.File.GetLastWriteTimeUtc(thumbnailPath);
            var videoLastWrite = System.IO.File.GetLastWriteTimeUtc(physicalVideoPath);
            if (thumbnailLastWrite >= videoLastWrite && new FileInfo(thumbnailPath).Length > 0)
            {
                return true;
            }
        }

        var ffmpegPath = Path.GetFullPath(fileSettingsProvider.FfmpegPath);
        if (!System.IO.File.Exists(ffmpegPath))
        {
            logger.LogWarning("FFmpeg executable was not found at {FfmpegPath}.", ffmpegPath);
            return false;
        }

        var arguments =
            $"-y -ss 00:00:01.500 -i \"{physicalVideoPath}\" -frames:v 1 " +
            $"-vf \"scale=640:-1:force_original_aspect_ratio=decrease\" \"{thumbnailPath}\"";

        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken,
            timeoutCts.Token);

        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = ffmpegPath,
                Arguments = arguments,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true,
                RedirectStandardOutput = true
            }
        };

        try
        {
            process.Start();
            await process.WaitForExitAsync(linkedCts.Token);

            if (process.ExitCode == 0 && System.IO.File.Exists(thumbnailPath) && new FileInfo(thumbnailPath).Length > 0)
            {
                return true;
            }

            var ffmpegError = await process.StandardError.ReadToEndAsync(cancellationToken);
            logger.LogWarning(
                "Failed to generate thumbnail for {VideoPath}. ExitCode: {ExitCode}. Error: {Error}",
                physicalVideoPath,
                process.ExitCode,
                ffmpegError);

            return false;
        }
        catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
        {
            TryStopProcess(process);
            logger.LogWarning("Timed out while generating thumbnail for {VideoPath}.", physicalVideoPath);
            return false;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            TryStopProcess(process);
            throw;
        }
    }

    private static byte[] BuildThumbnailPlaceholder(string? videoCode)
    {
        var safeLabel = string.IsNullOrWhiteSpace(videoCode)
            ? "Video preview"
            : videoCode.Replace("&", "&amp;")
                .Replace("<", "&lt;")
                .Replace(">", "&gt;")
                .Replace("\"", "&quot;");

        var svg = $$"""
            <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
              <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#0f172a" />
                  <stop offset="100%" stop-color="#1e293b" />
                </linearGradient>
              </defs>
              <rect width="640" height="360" fill="url(#bg)" />
              <circle cx="320" cy="180" r="44" fill="rgba(255,255,255,0.14)" />
              <polygon points="305,152 305,208 352,180" fill="#ffffff" />
              <text x="320" y="292" text-anchor="middle" fill="#e2e8f0" font-family="Segoe UI, Arial, sans-serif" font-size="24">{{safeLabel}}</text>
              <text x="320" y="320" text-anchor="middle" fill="#94a3b8" font-family="Segoe UI, Arial, sans-serif" font-size="16">Nhan de phat video</text>
            </svg>
            """;

        return System.Text.Encoding.UTF8.GetBytes(svg);
    }

    private static void TryStopProcess(Process process)
    {
        try
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }
        }
        catch
        {
            // Ignore cleanup failures for best-effort thumbnail generation.
        }
    }
}
