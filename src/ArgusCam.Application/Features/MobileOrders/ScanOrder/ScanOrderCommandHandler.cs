using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;
using ArgusCam.Domain.Entities.VideoStore;
using Hangfire;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ArgusCam.Application.Features.MobileOrders.ScanOrder;

public class ScanOrderCommandHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUserService,
    IBackgroundJobClient backgroundJob) : IRequestHandler<ScanOrderCommand, ResponseData>
{
    public async Task<ResponseData> Handle(ScanOrderCommand request, CancellationToken cancellationToken)
    {
        var orderCode = request.OrderCode.Trim();
        if (string.IsNullOrWhiteSpace(orderCode))
        {
            throw new BadRequestException("Ma don hang khong duoc de trong.");
        }

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

        var cameras = await context.Cameras
            .AsNoTracking()
            .Where(x => x.DeskId == desk.Id && !x.IsDeleted)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (cameras.Count == 0)
        {
            throw new BadRequestException("Ban lam viec chua duoc gan camera.");
        }

        var activeOrder = await context.Orders
            .Where(x => x.UserId == user.Id &&
                        x.DeskId == desk.Id &&
                        x.Status == 0 &&
                        !x.IsDeleted)
            .OrderByDescending(x => x.Start)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeOrder is not null &&
            string.Equals(activeOrder.Code, orderCode, StringComparison.OrdinalIgnoreCase))
        {
            return new ResponseData
            {
                Content = new MobileScanOrderResponse(
                    ToDto(activeOrder, desk.Name),
                    null,
                    IsDuplicateScan: true)
            };
        }

        var duplicateActiveOrderExists = await context.Orders
            .AnyAsync(x => x.Code == orderCode && x.Status == 0 && !x.IsDeleted, cancellationToken);
        if (duplicateActiveOrderExists)
        {
            throw new BadRequestException("Don hang dang hoat dong voi ma nay da ton tai.");
        }

        var now = DateTime.Now;
        MobileOrderDto? closedOrder = null;

        if (activeOrder is not null)
        {
            activeOrder.End = now;
            activeOrder.Status = 1;
            closedOrder = ToDto(activeOrder, desk.Name);
        }

        var nextOrder = new Order
        {
            Code = orderCode,
            Start = now,
            UserId = user.Id,
            DeskId = desk.Id,
            Status = 0,
            OrderStatus = 1,
            TotalWeight = 0,
            Note = $"Mobile scan at {now:O}",
            IsPacking = desk.IsPacking
        };

        foreach (var cameraId in cameras.Distinct())
        {
            nextOrder.OrderCameras.Add(new OrderCamera
            {
                OrderId = nextOrder.Id,
                CameraId = cameraId
            });
        }

        context.Orders.Add(nextOrder);
        await context.SaveChangesAsync(cancellationToken);

        if (activeOrder is not null && activeOrder.Start is not null && activeOrder.End is not null)
        {
            EnqueueDownload(activeOrder);
        }

        return new ResponseData
        {
            Content = new MobileScanOrderResponse(
                ToDto(nextOrder, desk.Name),
                closedOrder,
                IsDuplicateScan: false)
        };
    }

    private void EnqueueDownload(Order order)
    {
        backgroundJob.Enqueue<IVideoService>(x => x.DownloadVideosForOrder(
            order.Id.ToString(),
            order.IsPacking,
            order.Code,
            order.Start!.Value,
            order.End!.Value));
    }

    private static MobileOrderDto ToDto(Order order, string? deskName) =>
        new(order.Id, order.Code, order.Start, order.End, order.IsPacking, order.DeskId, deskName);
}
