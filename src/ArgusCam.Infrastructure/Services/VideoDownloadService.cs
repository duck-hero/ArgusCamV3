using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models.CameraProviders;
using ArgusCam.Domain.Entities.VideoStore;
using ArgusCam.Infrastructure.Configuration;

namespace ArgusCam.Infrastructure.Services;

public class VideoDownloadService(
    IApplicationDbContext context,
    ICameraProviderFactory cameraProviderFactory,
    IVideoProgressNotifier progressNotifier,
    IOptions<FileSettings> fileSettings,
    ILogger<VideoDownloadService> logger) : IVideoDownloadService
{
    private readonly FileSettings _fileSettings = fileSettings.Value;

    public async Task<bool> DownloadVideoClipAsync(
        string orderId,
        Guid cameraId,
        bool isPacking,
        string orderCode,
        uint cameraChannel,
        string cameraCode,
        DateTime start,
        DateTime end)
    {
        try
        {
            if (!Guid.TryParse(orderId, out var orderGuid))
            {
                await progressNotifier.SendError(orderId, orderCode, "OrderId khong hop le.");
                return false;
            }

            var camera = await context.Cameras
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == cameraId);

            if (camera == null)
            {
                await progressNotifier.SendError(orderId, orderCode, $"Khong tim thay camera {cameraCode}.");
                return false;
            }

            var provider = cameraProviderFactory.Resolve(camera);
            logger.LogInformation(
                "Resolved camera provider {ProviderKey} for camera {CameraCode}",
                provider.ProviderKey,
                camera.Code);

            var request = new CameraDownloadRequest
            {
                OrderId = orderId,
                OrderGuid = orderGuid,
                OrderCode = orderCode,
                Camera = camera,
                CameraChannel = cameraChannel,
                Start = start,
                End = end,
                IsPacking = isPacking,
            };

            CameraDownloadResult result = await provider.DownloadVideoAsync(request);
            if (!result.Success || string.IsNullOrWhiteSpace(result.FilePath))
            {
                if (!string.IsNullOrWhiteSpace(result.ErrorMessage))
                {
                    logger.LogWarning(
                        "Camera provider {ProviderKey} failed for camera {CameraCode}: {Error}",
                        provider.ProviderKey,
                        camera.Code,
                        result.ErrorMessage);
                }

                return false;
            }

            await progressNotifier.SendProgress(orderId, orderCode, 90, "Dang luu thong tin video...", "saving");

            bool saved = await SaveVideoMetadataAsync(orderGuid, cameraId, isPacking, result.FilePath, !result.IsTempFile);
            if (!saved)
            {
                await progressNotifier.SendError(orderId, orderCode, "Khong the luu metadata video.");
                return false;
            }

            await progressNotifier.SendProgress(orderId, orderCode, 95, $"Hoan thanh camera {cameraCode}", "saving");
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error while orchestrating download for order {OrderCode}, camera {CameraCode}", orderCode, cameraCode);
            await progressNotifier.SendError(orderId, orderCode, $"Loi khi xu ly video: {ex.Message}");
            return false;
        }
    }

    private async Task<bool> SaveVideoMetadataAsync(
        Guid orderId,
        Guid cameraId,
        bool isPacking,
        string finalVideoPath,
        bool isConverted)
    {
        string relativeVideoPath = Path.GetRelativePath(_fileSettings.UploadPath, finalVideoPath);

        bool alreadyExists = await context.Videos
            .AsNoTracking()
            .AnyAsync(v => v.OrderId == orderId && v.CameraId == cameraId && v.VideoPath == relativeVideoPath);

        if (alreadyExists)
        {
            logger.LogWarning(
                "Skipping duplicate video metadata. OrderId={OrderId}, CameraId={CameraId}, Path={Path}",
                orderId,
                cameraId,
                relativeVideoPath);
            return true;
        }

        context.Videos.Add(new Video
        {
            Code = Guid.NewGuid().ToString(),
            VideoPath = relativeVideoPath,
            Note = "Downloaded via camera provider",
            IsConverted = isConverted,
            IsPacking = isPacking,
            CameraId = cameraId,
            OrderId = orderId,
            CreatedBy = "System",
        });

        await context.SaveChangesAsync(CancellationToken.None);
        return true;
    }
}
