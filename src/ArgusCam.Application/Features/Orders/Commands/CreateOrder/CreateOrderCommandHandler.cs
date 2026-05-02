using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Domain.Entities.VideoStore;

namespace ArgusCam.Application.Features.Orders.Commands.CreateOrder;

public class CreateOrderCommandHandler(IApplicationDbContext context) : IRequestHandler<CreateOrderCommand, Guid>
{
    public async Task<Guid> Handle(CreateOrderCommand command, CancellationToken cancellationToken)
    {
        // Bước 1: Kiểm tra trùng mã đơn đang hoạt động.
        // Điều kiện đúng theo yêu cầu nghiệp vụ:
        // - Cùng OrderCode
        // - Status = 0 (đang xử lý)
        // - IsDeleted = false (chưa bị xóa mềm)
        var isExist = await context.Orders.AnyAsync(
            x => x.Code == command.OrderCode && x.Status == 0 && !x.IsDeleted,
            cancellationToken);
        if (isExist)
        {
            throw new BadRequestException("Đơn hàng đang hoạt động với mã này đã tồn tại.");
        }

        // Bước 2: Kiểm tra Desk và phiên làm việc của người dùng tại desk.
        // - Nếu Desk không tồn tại => scanner/desk không hợp lệ.
        // - Nếu desk chưa có CurrentUserId => chưa StartSession tại bàn này.
        var desk = await context.Desks
            .Include(d => d.CurrentUser)
            .FirstOrDefaultAsync(x => x.Id == command.DeskId && !x.IsDeleted, cancellationToken);

        if (desk == null)
        {
            throw new NotFoundException("Không tìm thấy desk. Vui lòng kiểm tra lại scanner code.");
        }

        if (desk.CurrentUserId == null)
        {
            throw new BadRequestException("Bàn này chưa có người dùng bắt đầu phiên làm việc.");
        }

        // Bước 3: Tạo đơn hàng mới và gán thông tin bắt đầu theo Unix timestamp.
        var order = new Order
        {
            Code = command.OrderCode,
            Start = ConvertDate(command.Start),
            UserId = desk.CurrentUserId.Value,
            DeskId = desk.Id,
            Status = 0,
            OrderStatus = 1,
            TotalWeight = 0,
            Note = command.Note ?? "",
            IsPacking = command.IsPacking,
        };

        context.Orders.Add(order);

        // Bước 4: Tạo liên kết OrderCamera để lưu đơn hàng này sử dụng camera nào.
        // Dùng Distinct để tránh trường hợp client gửi trùng camera.
        foreach (var cameraId in command.Cameras.Select(x => x.Id).Distinct())
        {
            var orderCamera = new OrderCamera
            {
                OrderId = order.Id,
                CameraId = cameraId,
            };
            order.OrderCameras.Add(orderCamera);
        }

        await context.SaveChangesAsync(cancellationToken);

        return order.Id;
    }

    private DateTime ConvertDate(long unixTimestamp)
    {
        // Chuyển Unix timestamp (seconds) sang DateTime local theo đúng yêu cầu nghiệp vụ.
        DateTime dateTime = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            .AddSeconds(unixTimestamp);

        return dateTime.ToLocalTime();
    }
}
