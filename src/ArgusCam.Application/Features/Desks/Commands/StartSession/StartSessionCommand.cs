using MediatR;

namespace ArgusCam.Application.Features.Desks.Commands.StartSession;

/// <summary>
/// Command bắt đầu một phiên làm việc tại bàn.
/// Command này nhận dữ liệu từ request body của API StartSession và chuyển vào tầng Application
/// để xử lý cập nhật thông tin phiên hiện tại cho Desk.
/// </summary>
public record StartSessionCommand : IRequest<bool>
{
    /// <summary>
    /// Mã scanner hoặc mã phiên được client gửi lên để định danh phiên quét hiện tại.
    /// Giá trị này được lưu vào CurrentScannerCode của bàn để phục vụ các bước nghiệp vụ tiếp theo.
    /// </summary>
    public string? ScannerCode { get; init; }

    /// <summary>
    /// Id người dùng đang thao tác tại bàn.
    /// Hệ thống sẽ gán giá trị này vào CurrentUserId của bàn.
    /// </summary>
    public Guid UserId { get; init; }

    /// <summary>
    /// Id của bàn cần bắt đầu phiên làm việc.
    /// Handler sẽ dựa vào Id này để tìm đúng Desk trong database.
    /// </summary>
    public Guid DeskId { get; init; }

    /// <summary>
    /// Cờ xác định phiên này thuộc luồng đóng gói hay không.
    /// Giá trị sẽ được cập nhật vào trường IsPacking của bàn.
    /// </summary>
    public bool IsPacking { get; init; }
}
