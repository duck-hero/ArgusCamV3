using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;
using ArgusCam.Domain.Entities.VideoStore;
using Hangfire;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ArgusCam.Application.Features.MobileOrders.EndActiveOrder;

public class EndActiveOrderCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUserService,
    IBackgroundJobClient backgroundJob) : IRequestHandler<EndActiveOrderCommand, ResponseData>
{
    public async Task<ResponseData> Handle(EndActiveOrderCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId
            ?? throw new UnauthorizedException("User is not authenticated.");

        var user = await context.Users
            .AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => new { x.Id, x.DeskId })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new UnauthorizedException("User not found.");

        if (user.DeskId is null || user.DeskId == Guid.Empty)
        {
            throw new BadRequestException("Tai khoan chua duoc gan ban lam viec.");
        }

        var desk = await context.Desks
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == user.DeskId && !x.IsDeleted, cancellationToken)
            ?? throw new BadRequestException("Ban lam viec khong ton tai hoac da bi xoa.");

        var activeOrder = await context.Orders
            .Where(x => x.UserId == user.Id &&
                        x.DeskId == desk.Id &&
                        x.Status == 0 &&
                        !x.IsDeleted)
            .OrderByDescending(x => x.Start)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeOrder is null)
        {
            return new ResponseData { Content = new { ActiveOrder = (MobileOrderDto?)null } };
        }

        activeOrder.End = DateTime.Now;
        activeOrder.Status = 1;

        await context.SaveChangesAsync(cancellationToken);

        if (activeOrder.Start is not null && activeOrder.End is not null)
        {
            backgroundJob.Enqueue<IVideoService>(x => x.DownloadVideosForOrder(
                activeOrder.Id.ToString(),
                activeOrder.IsPacking,
                activeOrder.Code,
                activeOrder.Start.Value,
                activeOrder.End.Value));
        }

        return new ResponseData
        {
            Content = new { ClosedOrder = ToDto(activeOrder, desk.Name), ActiveOrder = (MobileOrderDto?)null }
        };
    }

    private static MobileOrderDto ToDto(Order order, string? deskName) =>
        new(order.Id, order.Code, order.Start, order.End, order.IsPacking, order.DeskId, deskName);
}
