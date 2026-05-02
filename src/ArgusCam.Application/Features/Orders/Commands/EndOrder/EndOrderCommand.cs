using MediatR;

namespace ArgusCam.Application.Features.Orders.Commands.EndOrder;

/// <summary>
/// Command kết thúc đơn hàng.
/// Chỉ sử dụng End (Unix timestamp).
/// </summary>
public record EndOrderCommand : IRequest<bool>
{
    /// <summary>
    /// Id đơn hàng cần kết thúc.
    /// </summary>
    public Guid OrderId { get; set; }

    /// <summary>
    /// Thời điểm kết thúc ở dạng Unix timestamp (seconds).
    /// </summary>
    public long End { get; set; }
}
