using Mapster;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Cameras.Queries.GetCameras;

/// <summary>
/// Xử lý lấy danh sách Camera có phân trang theo Cursor (ID).
/// </summary>
public class GetCamerasQueryHandler : IRequestHandler<GetCamerasQuery, ResponseData>
{
    private readonly IApplicationDbContext _context;

    public GetCamerasQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ResponseData> Handle(GetCamerasQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Cameras
            .Include(c => c.Desk)
            .AsNoTracking();

        // 1. Filtering
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim().ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(term) || x.Code.ToLower().Contains(term));
        }

        if (request.DeskId.HasValue)
        {
            query = query.Where(x => x.DeskId == request.DeskId);
        }

        // 2. Cursor Lookup
        if (!string.IsNullOrEmpty(request.Cursor) && Guid.TryParse(request.Cursor, out var cursorId))
        {
            var cursorItem = await _context.Cameras.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == cursorId, cancellationToken);

            if (cursorItem != null)
            {
                var cursorDate = cursorItem.CreatedOn;
                query = query.Where(x => x.CreatedOn < cursorDate || (x.CreatedOn == cursorDate && x.Id.CompareTo(cursorId) < 0));
            }
        }

        // 3. Sorting & Paging
        var limit = request.Limit > 100 ? 100 : request.Limit;
        if (limit < 1) limit = 10;

        var items = await query
            .OrderByDescending(x => x.CreatedOn)
            .ThenByDescending(x => x.Id)
            .Take(limit + 1)
            .ProjectToType<CameraDto>() 
            .ToListAsync(cancellationToken);

        // 4. Construct Response
        var hasNextPage = items.Count > limit;
        if (hasNextPage) items.RemoveAt(limit);

        string? nextCursor = null;
        if (hasNextPage && items.Count > 0)
        {
            nextCursor = items.Last().Id.ToString();
        }

        return new ResponseData
        {
            Content = new CursorPaginatedResponse<CameraDto>
            {
                Items = items,
                NextCursor = nextCursor,
                HasNextPage = hasNextPage
            }
        };
    }
}