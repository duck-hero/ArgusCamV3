using Hangfire;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Videos.Commands.DownloadOrderVideos;

public class DownloadOrderVideosCommand : IRequest<ResponseData>
{
    public Guid OrderId { get; set; }
}

public class DownloadOrderVideosCommandHandler : IRequestHandler<DownloadOrderVideosCommand, ResponseData>
{
    private readonly IApplicationDbContext _context;
    private readonly IBackgroundJobClient _backgroundJob;

    public DownloadOrderVideosCommandHandler(IApplicationDbContext context, IBackgroundJobClient backgroundJob)
    {
        _context = context;
        _backgroundJob = backgroundJob;
    }

    public async Task<ResponseData> Handle(DownloadOrderVideosCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.OrderId, cancellationToken);

        if (order == null)
        {
            throw new NotFoundException("Order not found");
        }

        if (order.Start == null || order.End == null)
        {
            throw new BadRequestException("Order does not have valid Start/End times.");
        }

        var orderCameras = await _context.OrderCameras
            .Include(oc => oc.Camera)
            .Where(oc => oc.OrderId == request.OrderId)
            .ToListAsync(cancellationToken);

        if (orderCameras.Count == 0)
        {
            throw new BadRequestException("Order does not have any related cameras.");
        }

        _backgroundJob.Enqueue<IVideoService>(x => x.DownloadVideosForOrder(
            request.OrderId.ToString(),
            order.IsPacking,
            order.Code,
            order.Start.Value,
            order.End.Value
        ));

        return new ResponseData
        {
            Content = "\u0110ang th\u1EF1c hi\u1EC7n qu\u00E1 tr\u00ECnh t\u1EA3i video, qu\u00E1 tr\u00ECnh c\u00F3 th\u1EC3 m\u1EA5t 3-5 ph\u00FAt!"
        };
    }
}
