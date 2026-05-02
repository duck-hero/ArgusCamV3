using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ArgusCam.Infrastructure.Hubs;

/// <summary>
/// SignalR Hub để gửi tiến trình tải/xử lý video realtime đến client.
/// Client join vào group "order_{orderId}" để nhận progress của đơn hàng cụ thể.
/// AllowAnonymous vì progress tracking không cần xác thực.
/// </summary>
[AllowAnonymous]
public class VideoProcessingHub : Hub
{
    /// <summary>
    /// Client gọi method này để join vào group theo orderId,
    /// từ đó chỉ nhận progress của đơn hàng mình quan tâm.
    /// </summary>
    public async Task JoinOrderGroup(string orderId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"order_{orderId}");
    }

    /// <summary>
    /// Client gọi method này để rời group khi không cần theo dõi nữa.
    /// </summary>
    public async Task LeaveOrderGroup(string orderId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"order_{orderId}");
    }
}
