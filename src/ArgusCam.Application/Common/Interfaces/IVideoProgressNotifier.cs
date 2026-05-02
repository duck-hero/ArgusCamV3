namespace ArgusCam.Application.Common.Interfaces;

/// <summary>
/// Interface để gửi thông báo tiến trình tải video realtime đến client.
/// </summary>
public interface IVideoProgressNotifier
{
    Task SendProgress(string orderId, string orderCode, int progress, string message, string stage);
    Task SendCompleted(string orderId, string orderCode);
    Task SendError(string orderId, string orderCode, string errorMessage);
}
