using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;

namespace ArgusCam.Application.Features.Orders.Commands.EndOrder;

public class EndOrderCommandHandler(IApplicationDbContext context) : IRequestHandler<EndOrderCommand, bool>
{
    public async Task<bool> Handle(EndOrderCommand command, CancellationToken cancellationToken)
    {
        // Bước 1: Tìm đơn hàng đang hoạt động theo OrderId.
        // Điều kiện đúng theo yêu cầu:
        // - Id khớp
        // - Status = 0 (đang xử lý)
        // - IsDeleted = false
        var order = await context.Orders
            .FirstOrDefaultAsync(x => x.Id == command.OrderId && x.Status == 0 && !x.IsDeleted, cancellationToken);

        if (order == null)
        {
            throw new NotFoundException("Không tìm thấy đơn hàng đang hoạt động.");
        }

        // Bước 2: Cập nhật thời điểm kết thúc và chuyển trạng thái sang đã hoàn tất.
        order.End = ConvertDate(command.End);
        order.Status = 1;

        await context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private DateTime ConvertDate(long unixTimestamp)
    {
        // Chuyển Unix timestamp (seconds) sang DateTime local theo đúng yêu cầu nghiệp vụ.
        DateTime dateTime = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            .AddSeconds(unixTimestamp);

        return dateTime.ToLocalTime();
    }
}
