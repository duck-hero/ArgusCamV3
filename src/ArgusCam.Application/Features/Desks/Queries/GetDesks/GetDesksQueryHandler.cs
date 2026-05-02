using Mapster;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Desks.Queries.GetDesks;

/// <summary>
/// Xử lý lấy danh sách Bàn (Desks) có phân trang Cursor (theo ID).
/// </summary>
public class GetDesksQueryHandler : IRequestHandler<GetDesksQuery, ResponseData>
{
    private readonly IApplicationDbContext _context;

    public GetDesksQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ResponseData> Handle(GetDesksQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Desks.AsNoTracking();

        // 1. Filter
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(term) || x.Code.ToLower().Contains(term));
        }

        // 2. Cursor Lookup
        if (!string.IsNullOrEmpty(request.Cursor) && Guid.TryParse(request.Cursor, out var cursorId))
        {
            // Tìm item ứng với cursor để lấy mốc thời gian (CreatedOn)
            var cursorItem = await _context.Desks.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == cursorId, cancellationToken);

            if (cursorItem != null)
            {
                var cursorDate = cursorItem.CreatedOn;
                // Áp dụng điều kiện: lấy những thằng CŨ HƠN (CreatedOn nhỏ hơn) hoặc CÙNG NGÀY nhưng ID nhỏ hơn
                query = query.Where(x => x.CreatedOn < cursorDate || (x.CreatedOn == cursorDate && x.Id.CompareTo(cursorId) < 0));
            }
        }

        // 3. Paging
        var limit = request.Limit > 100 ? 100 : request.Limit;
        if (limit < 1) limit = 10;

        var items = await query
            .OrderByDescending(x => x.CreatedOn)
            .ThenByDescending(x => x.Id)
            .Take(limit + 1)
            .ProjectToType<DeskDto>()
            .ToListAsync(cancellationToken);

        // 4. Response
        var hasNextPage = items.Count > limit;
        if (hasNextPage) items.RemoveAt(limit);

        string? nextCursor = null;
        if (hasNextPage && items.Count > 0)
        {
            // Cursor trả về chỉ là ID của phần tử cuối cùng
            nextCursor = items.Last().Id.ToString();
        }

        return new ResponseData
        {
            Content = new CursorPaginatedResponse<DeskDto>
            {
                Items = items,
                NextCursor = nextCursor,
                HasNextPage = hasNextPage
            }
        };
    }
}
