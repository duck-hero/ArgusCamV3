using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Domain.Entities.VideoStore;
using ArgusCam.Infrastructure.Configuration;

namespace ArgusCam.Infrastructure.Services;

public class VideoService(
    IApplicationDbContext context,
    IOptions<FileSettings> fileSettings,
    IVideoDownloadService videoDownloadService,
    IVideoProgressNotifier progressNotifier,
    ILogger<VideoService> logger) : IVideoService
{
    private readonly FileSettings _fileSettings = fileSettings.Value;

    public async Task DownloadVideosForOrder(string orderId, bool isPacking, string orderCode, DateTime start, DateTime end)
    {
        var orderGuid = Guid.Parse(orderId);

        var cameras = await context.OrderCameras
            .Include(oc => oc.Camera)
            .Where(oc => oc.OrderId == orderGuid)
            .Select(oc => oc.Camera)
            .ToListAsync();

        if (!cameras.Any())
        {
            logger.LogWarning("No cameras found for order {OrderCode}", orderCode);
            await progressNotifier.SendError(orderId, orderCode, "Khong tim thay camera nao cho don hang nay.");
            return;
        }

        int successCount = 0;
        int failureCount = 0;

        foreach (var camera in cameras)
        {
            if (camera == null)
            {
                failureCount++;
                continue;
            }

            try
            {
                uint channel = 1;
                if (uint.TryParse(camera.CameraChannel, out var parsedChannel))
                {
                    channel = parsedChannel;
                }

                bool success = await videoDownloadService.DownloadVideoClipAsync(
                    orderId,
                    camera.Id,
                    isPacking,
                    orderCode,
                    channel,
                    camera.Code,
                    start,
                    end);

                if (success)
                {
                    successCount++;
                }
                else
                {
                    failureCount++;
                }
            }
            catch (Exception ex)
            {
                failureCount++;
                logger.LogError(ex, "Failed to download video from camera {CameraCode}", camera.Code);
                await progressNotifier.SendError(orderId, orderCode, $"Loi camera {camera.Code}: {ex.Message}");
            }
        }

        if (failureCount == 0 && successCount > 0)
        {
            await progressNotifier.SendCompleted(orderId, orderCode);
            return;
        }

        if (successCount == 0)
        {
            await progressNotifier.SendError(orderId, orderCode, "Khong tai duoc video tu bat ky camera nao.");
            return;
        }

        await progressNotifier.SendError(
            orderId,
            orderCode,
            $"Tai video hoan tat mot phan: thanh cong {successCount}, that bai {failureCount}.");
    }

    public async Task<(string filePath, bool isTempFile)> DownloadVideoFromCamera(
        int userId,
        string orderId,
        string orderCode,
        uint channel,
        string cameraCode,
        DateTime start,
        DateTime end)
    {
        logger.LogInformation("Downloading mock video for order {OrderCode} from camera {CameraCode}", orderCode, cameraCode);

        var now = DateTime.Now;
        string folder = start.Date.ToString("ddMMyyyy");
        string videoFileName = $"{orderCode}-{start:ddMMyyyy-HHmmss}-{end:HHmmss}-{now:ddMMyy-HHmmss}-{channel}.mp4";

        string videoFolderPath = Path.Combine(_fileSettings.UploadPath, folder);
        Directory.CreateDirectory(videoFolderPath);

        string fullFilePath = Path.Combine(videoFolderPath, videoFileName);
        await File.WriteAllTextAsync(fullFilePath, "Mock video content for demo.");

        string outputFilePath = fullFilePath.Replace(".mp4", "_resized.mp4", StringComparison.OrdinalIgnoreCase);
        bool convertSuccess = await ConvertVideoAsync(fullFilePath, outputFilePath);

        if (!convertSuccess)
        {
            return (fullFilePath, true);
        }

        context.Videos.Add(new Video
        {
            Code = Guid.NewGuid().ToString(),
            VideoPath = Path.GetRelativePath(_fileSettings.UploadPath, outputFilePath),
            Note = "Downloaded via Hangfire",
            CreatedBy = "System",
            IsConverted = true,
            IsPacking = true,
            OrderId = Guid.Parse(orderId),
        });

        await context.SaveChangesAsync(CancellationToken.None);
        return (outputFilePath, false);
    }

    private async Task<bool> ConvertVideoAsync(string inputPath, string outputPath)
    {
        try
        {
            string ffmpegPath = _fileSettings.FfmpegPath;
            if (!File.Exists(ffmpegPath))
            {
                logger.LogError("FFmpeg executable was not found at {Path}", ffmpegPath);
                return false;
            }

            string arguments = $"-y -i \"{inputPath}\" -c:v libx264 -preset superfast -crf 28 -c:a aac \"{outputPath}\"";

            var processStartInfo = new ProcessStartInfo
            {
                FileName = ffmpegPath,
                Arguments = arguments,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };

            using var process = new Process { StartInfo = processStartInfo };
            process.Start();

            await process.WaitForExitAsync(new CancellationTokenSource(TimeSpan.FromMinutes(15)).Token);

            if (process.ExitCode != 0)
            {
                logger.LogError("FFmpeg exited with error code {ExitCode}", process.ExitCode);
                return false;
            }

            return File.Exists(outputPath) && new FileInfo(outputPath).Length > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error during mock video conversion");
            return false;
        }
    }
}
