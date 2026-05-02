namespace ArgusCam.Application.Common.Interfaces;

public interface IVideoService
{
    Task DownloadVideosForOrder(string orderId, bool isPacking, string orderCode, DateTime start, DateTime end);
    Task<(string filePath, bool isTempFile)> DownloadVideoFromCamera(int userId, string orderId, string orderCode, uint channel, string cameraCode, DateTime start, DateTime end);
}
