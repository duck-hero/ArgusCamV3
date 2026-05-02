namespace ArgusCam.Application.Common.Interfaces;

/// <summary>
/// Định nghĩa service chuyên trách tải video theo từng camera.
/// Interface này tách riêng khỏi IVideoService để dễ mở rộng các cơ chế tải chuyên sâu
/// (SDK camera, retry, giới hạn đồng thời, theo dõi tiến độ...) mà không làm phình logic điều phối.
/// </summary>
public interface IVideoDownloadService
{
    /// <summary>
    /// Tải một đoạn video từ camera cho một đơn hàng cụ thể.
    /// Hàm này chịu trách nhiệm toàn bộ pipeline ở mức "một camera":
    /// 1) Chuẩn bị đường dẫn lưu file.
    /// 2) Tải file video thô từ camera (hiện tại đang dùng mock, có thể thay bằng SDK thật).
    /// 3) Chuyển đổi định dạng bằng FFmpeg.
    /// 4) Lưu metadata video vào database.
    /// 5) Dọn dẹp file tạm nếu cần.
    /// </summary>
    /// <param name="orderId">Id đơn hàng ở dạng chuỗi (dùng để parse về Guid khi lưu DB).</param>
    /// <param name="cameraId">Id camera (kiểu Guid theo domain hiện tại).</param>
    /// <param name="isPacking">Trạng thái đóng gói tại thời điểm tạo video.</param>
    /// <param name="orderCode">Mã đơn hàng dùng để ghép tên file.</param>
    /// <param name="cameraChannel">Kênh camera cần tải.</param>
    /// <param name="cameraCode">Mã camera dùng cho log/ngữ cảnh nghiệp vụ.</param>
    /// <param name="start">Thời điểm bắt đầu clip.</param>
    /// <param name="end">Thời điểm kết thúc clip.</param>
    /// <returns>
    /// Task bất đồng bộ; hàm không trả dữ liệu vì metadata sẽ được lưu trực tiếp vào database.
    /// </returns>
    Task<bool> DownloadVideoClipAsync(
        string orderId,
        Guid cameraId,
        bool isPacking,
        string orderCode,
        uint cameraChannel,
        string cameraCode,
        DateTime start,
        DateTime end);
}
