namespace ArgusCam.Application.Common.Interfaces;

public interface IGo2RtcService
{
    /// <summary>
    /// Bắt đầu hoặc lấy luồng stream cho camera với loại luồng cụ thể.
    /// </summary>
    /// <param name="streamKey">Định danh duy nhất (ví dụ: {cameraId}_{type})</param>
    /// <param name="rtspUrl">Đường dẫn RTSP</param>
    /// <returns>Websocket URL</returns>
    Task<string> GetStreamUrlAsync(string streamKey, string rtspUrl);

    /// <summary>
    /// Gửi tín hiệu nhịp tim để giữ kết nối cho luồng cụ thể.
    /// </summary>
    void SendHeartbeat(string streamKey);
}