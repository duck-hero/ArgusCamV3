using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using ArgusCam.Application.Common.Interfaces;

namespace ArgusCam.Infrastructure.Services;

/// <summary>
/// Gửi thông báo tiến trình tải video qua SignalR hub đến client.
/// Sử dụng group "order_{orderId}" để chỉ gửi cho client đang theo dõi đơn hàng đó.
/// </summary>
public class VideoProgressNotifier(
    IHubContext<ArgusCam.Infrastructure.Hubs.VideoProcessingHub> hubContext,
    ILogger<VideoProgressNotifier> logger) : IVideoProgressNotifier
{
    public async Task SendProgress(string orderId, string orderCode, int progress, string message, string stage)
    {
        try
        {
            var data = new
            {
                orderId,
                orderCode,
                progress = Math.Min(progress, 100),
                message,
                stage,
                timestamp = DateTime.UtcNow
            };

            await hubContext.Clients.Group($"order_{orderId}").SendAsync("ProgressUpdate", data);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send progress notification for order {OrderCode}", orderCode);
        }
    }

    public async Task SendCompleted(string orderId, string orderCode)
    {
        try
        {
            var data = new
            {
                orderId,
                orderCode,
                progress = 100,
                status = "success",
                message = $"Video của đơn {orderCode} đã sẵn sàng!",
                stage = "completed",
                timestamp = DateTime.UtcNow
            };

            await hubContext.Clients.Group($"order_{orderId}").SendAsync("VideoCompleted", data);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send completion notification for order {OrderCode}", orderCode);
        }
    }

    public async Task SendError(string orderId, string orderCode, string errorMessage)
    {
        try
        {
            var data = new
            {
                orderId,
                orderCode,
                progress = -1,
                status = "error",
                message = errorMessage,
                stage = "error",
                timestamp = DateTime.UtcNow
            };

            await hubContext.Clients.Group($"order_{orderId}").SendAsync("VideoError", data);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send error notification for order {OrderCode}", orderCode);
        }
    }
}
