using MediatR;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;

namespace ArgusCam.Application.Features.Auth.Queries.GetQR;

public class GetQRQueryHandler(
    IApplicationDbContext context) : IRequestHandler<GetQRQuery, SingleQrResponse>
{
    public async Task<SingleQrResponse> Handle(GetQRQuery request, CancellationToken cancellationToken)
    {
        var user = await context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
            
        if (user == null) throw new NotFoundException("User not found");

        var desk = await context.Desks
            .FirstOrDefaultAsync(d => d.Id == user.DeskId, cancellationToken);
            
        var cameras = await context.Cameras
            .Where(c => c.DeskId == user.DeskId && !c.IsDeleted)
            .Select(c => new CameraQrDto(c.Id, c.Code, c.Name, c.CameraIP, c.CameraChannel, c.SDKPort))
            .ToListAsync(cancellationToken);

        var session = new UserSessionQrContent(
            user.Id,
            user.DeskId,
            "STARTSESSION",
            cameras
        );

        return new SingleQrResponse
        {
            Label = $"{user.FullName} - {desk?.Name ?? "N/A"}",
            JsonContent = JsonConvert.SerializeObject(session)
        };
    }
}
