using MediatR;

namespace ArgusCam.Application.Features.Orders.Commands.CreateOrder;

/// <summary>
/// DTO đơn giản để nhận danh sách camera được gán cho đơn hàng khi tạo mới.
/// Hệ thống chỉ cần Id camera để tạo liên kết OrderCamera.
/// </summary>
public record CameraDto(Guid Id);

/// <summary>
/// Command tạo mới đơn hàng.
/// Yêu cầu đầu vào: Start, OrderCode, DeskId, IsPacking, Cameras.
/// </summary>
public record CreateOrderCommand : IRequest<Guid>
{
    /// <summary>
    /// Mã đơn hàng cần tạo.
    /// </summary>
    public string OrderCode { get; set; } = string.Empty;

    /// <summary>
    /// Id bàn thao tác đơn hàng.
    /// </summary>
    public Guid DeskId { get; set; }

    /// <summary>
    /// Thời điểm bắt đầu đơn hàng ở dạng Unix timestamp (seconds).
    /// </summary>
    public long Start { get; set; }

    /// <summary>
    /// Danh sách camera sẽ được gán với đơn hàng.
    /// </summary>
    public List<CameraDto> Cameras { get; set; } = [];

    /// <summary>
    /// Ghi chú bổ sung cho đơn hàng.
    /// </summary>
    public string? Note { get; set; }

    /// <summary>
    /// Có phải đơn packing hay không.
    /// </summary>
    public bool IsPacking { get; set; }

}
