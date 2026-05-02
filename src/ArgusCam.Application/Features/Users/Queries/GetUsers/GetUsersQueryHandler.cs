using Mapster;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Application.Features.Users.Queries.GetUsers;

/// <summary>
/// Xử lý lấy danh sách Người dùng (Users) có phân trang Cursor (ID).
/// </summary>
public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, ResponseData>
{
    private readonly IApplicationDbContext _context;
    private readonly UserManager<User> _userManager;

    public GetUsersQueryHandler(IApplicationDbContext context, UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<ResponseData> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Users.AsNoTracking();

        // 1. Filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            query = query.Where(x => 
                (x.FullName != null && x.FullName.ToLower().Contains(term)) || 
                (x.Email != null && x.Email.ToLower().Contains(term)) ||
                (x.UserName != null && x.UserName.ToLower().Contains(term)));
        }

        if (request.Status.HasValue)
        {
            query = query.Where(x => x.Status == request.Status);
        }

        // 2. Cursor Lookup
        if (!string.IsNullOrEmpty(request.Cursor) && Guid.TryParse(request.Cursor, out var cursorId))
        {
            var cursorItem = await _context.Users.AsNoTracking()
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

        var users = await query
            .OrderByDescending(x => x.CreatedOn)
            .ThenByDescending(x => x.Id)
            .Take(limit + 1)
            .ToListAsync(cancellationToken);

        // 4. Lấy trước danh sách bàn làm việc theo DeskId của user để map vào response.
        // Cách này tránh query lặp lại cho từng user.
        var deskIds = users
            .Where(x => x.DeskId.HasValue)
            .Select(x => x.DeskId!.Value)
            .Distinct()
            .ToList();

        var deskLookup = await _context.Desks
            .AsNoTracking()
            .Where(x => deskIds.Contains(x.Id) && !x.IsDeleted)
            .Select(x => new { x.Id, x.Name, x.Code })
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        // 4. Map to DTO & Fetch Roles
        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            var dto = user.Adapt<UserDto>();

            // Gán thông tin bàn làm việc nếu user có DeskId hợp lệ.
            if (user.DeskId.HasValue && deskLookup.TryGetValue(user.DeskId.Value, out var desk))
            {
                dto.Desk = new UserDeskDto
                {
                    Id = desk.Id,
                    DeskName = desk.Name,
                    DeskCode = desk.Code
                };
            }

            // Fetch roles individually (Acceptable for small page sizes)
            var roles = await _userManager.GetRolesAsync(user);
            dto.Roles = roles.ToList();
            dtos.Add(dto);
        }

        // 5. Response Construction
        var hasNextPage = dtos.Count > limit;
        if (hasNextPage) dtos.RemoveAt(limit);

        string? nextCursor = null;
        if (hasNextPage && dtos.Count > 0)
        {
            nextCursor = dtos.Last().Id.ToString();
        }

        return new ResponseData
        {
            Content = new CursorPaginatedResponse<UserDto>
            {
                Items = dtos,
                NextCursor = nextCursor,
                HasNextPage = hasNextPage
            }
        };
    }
}
