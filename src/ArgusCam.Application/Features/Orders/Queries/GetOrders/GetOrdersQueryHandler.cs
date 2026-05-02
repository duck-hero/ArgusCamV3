using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Application.Features.Orders.Queries.GetOrders;

/// <summary>
/// Xử lý lấy danh sách Đơn hàng (Orders) có phân trang Cursor (ID).
/// </summary>
public class GetOrdersQueryHandler : IRequestHandler<GetOrdersQuery, ResponseData>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly UserManager<User> _userManager;

    public GetOrdersQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        UserManager<User> userManager)
    {
        _context = context;
        _currentUserService = currentUserService;
        _userManager = userManager;
    }

    public async Task<ResponseData> Handle(GetOrdersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Orders
            .AsNoTracking();

        var currentUserId = _currentUserService.UserId;
        var isAdmin = false;

        if (currentUserId.HasValue)
        {
            var currentUser = await _userManager.FindByIdAsync(currentUserId.Value.ToString());
            if (currentUser is not null && !currentUser.IsDeleted)
            {
                var roles = await _userManager.GetRolesAsync(currentUser);
                isAdmin = roles.Any(role => role.Equals("Admin", StringComparison.OrdinalIgnoreCase));
            }
        }

        // 1. Filter
        if (!string.IsNullOrWhiteSpace(request.Code))
        {
            var term = request.Code.Trim().ToLower();
            query = query.Where(x => x.Code.ToLower().Contains(term));
        }

        if (request.Status.HasValue)
        {
            query = query.Where(x => x.Status == request.Status);
        }

        if (!isAdmin && currentUserId.HasValue)
        {
            query = query.Where(x => x.UserId == currentUserId.Value);
        }
        else if (request.UserId.HasValue)
        {
            query = query.Where(x => x.UserId == request.UserId);
        }

        if (request.IsPacking.HasValue)
        {
            query = query.Where(x => x.IsPacking == request.IsPacking.Value);
        }

        if (request.StartFrom.HasValue)
        {
            query = query.Where(x => x.Start.HasValue && x.Start.Value >= request.StartFrom.Value);
        }

        if (request.StartTo.HasValue)
        {
            query = query.Where(x => x.Start.HasValue && x.Start.Value <= request.StartTo.Value);
        }

        // 2. Cursor Lookup
        if (!string.IsNullOrEmpty(request.Cursor) && Guid.TryParse(request.Cursor, out var cursorId))
        {
            var cursorItem = await _context.Orders.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == cursorId, cancellationToken);

            if (cursorItem != null)
            {
                var cursorDate = cursorItem.CreatedOn;
                query = query.Where(x => x.CreatedOn < cursorDate || (x.CreatedOn == cursorDate && x.Id.CompareTo(cursorId) < 0));
            }
        }

        // 3. Paging
        var limit = request.Limit > 100 ? 100 : request.Limit;
        if (limit < 1) limit = 10;

        var usersQuery = _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking();

        var items = await (
            from order in query
            join user in usersQuery on order.UserId equals user.Id into userGroup
            from user in userGroup.DefaultIfEmpty()
            orderby order.CreatedOn descending, order.Id descending
            select new OrderDto
            {
                Id = order.Id,
                Code = order.Code,
                Start = order.Start,
                End = order.End,
                Status = order.Status,
                OrderStatus = order.OrderStatus,
                Note = order.Note,
                IsPacking = order.IsPacking,
                UserId = order.UserId,
                UserName = user != null ? user.UserName : null,
                CreatedOn = order.CreatedOn
            })
            .Take(limit + 1)
            .ToListAsync(cancellationToken);

        // 4. Response
        var hasNextPage = items.Count > limit;
        if (hasNextPage) items.RemoveAt(limit);

        string? nextCursor = null;
        if (hasNextPage && items.Count > 0)
        {
            nextCursor = items.Last().Id.ToString();
        }

        return new ResponseData
        {
            Content = new CursorPaginatedResponse<OrderDto>
            {
                Items = items,
                NextCursor = nextCursor,
                HasNextPage = hasNextPage
            }
        };
    }
}
