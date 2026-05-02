using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ArgusCam.Application.Features.MobileOrders.GetActiveOrder;

public class GetActiveOrderQueryHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUserService) : IRequestHandler<GetActiveOrderQuery, ResponseData>
{
    public async Task<ResponseData> Handle(GetActiveOrderQuery request, CancellationToken cancellationToken)
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
            return new ResponseData { Content = new { ActiveOrder = (MobileOrderDto?)null, DeskName = (string?)null } };
        }

        var activeOrder = await context.Orders
            .AsNoTracking()
            .Where(x => x.UserId == user.Id &&
                        x.DeskId == user.DeskId &&
                        x.Status == 0 &&
                        !x.IsDeleted)
            .OrderByDescending(x => x.Start)
            .Select(x => new MobileOrderDto(
                x.Id,
                x.Code,
                x.Start,
                x.End,
                x.IsPacking,
                x.DeskId,
                x.Desk != null ? x.Desk.Name : null))
            .FirstOrDefaultAsync(cancellationToken);

        var deskName = await context.Desks
            .AsNoTracking()
            .Where(x => x.Id == user.DeskId)
            .Select(x => x.Name)
            .FirstOrDefaultAsync(cancellationToken);

        return new ResponseData { Content = new { ActiveOrder = activeOrder, DeskName = deskName } };
    }
}
