using Mapster;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Videos.Queries.GetVideos;

/// <summary>
/// Xử lý lấy danh sách Video (không phân trang).
/// </summary>
public class GetVideosQueryHandler : IRequestHandler<GetVideosQuery, ResponseData>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileSettingsProvider _fileSettingsProvider;

    public GetVideosQueryHandler(IApplicationDbContext context, IFileSettingsProvider fileSettingsProvider)
    {
        _context = context;
        _fileSettingsProvider = fileSettingsProvider;
    }

    public async Task<ResponseData> Handle(GetVideosQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Videos
            .Include(v => v.Camera)
            .Include(v => v.Order)
            .AsNoTracking();

        // Filter
        if (request.OrderId.HasValue)
        {
            query = query.Where(x => x.OrderId == request.OrderId);
        }

        if (request.IsPacking.HasValue)
        {
            query = query.Where(x => x.IsPacking == request.IsPacking);
        }

        var items = await query
            .OrderByDescending(x => x.CreatedOn)
            .ProjectToType<VideoDto>()
            .ToListAsync(cancellationToken);

        // Convert relative VideoPath to absolute path
        var uploadPath = _fileSettingsProvider.UploadPath;
        foreach (var item in items)
        {
            if (!string.IsNullOrEmpty(item.VideoPath))
            {
                item.VideoPath = Path.Combine(uploadPath, item.VideoPath);
            }
        }

        return new ResponseData
        {
            Content = items
        };
    }
}
