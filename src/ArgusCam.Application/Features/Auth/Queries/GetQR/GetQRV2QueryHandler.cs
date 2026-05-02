using MediatR;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;

namespace ArgusCam.Application.Features.Auth.Queries.GetQR;

public class GetQRV2QueryHandler(
    IApplicationDbContext context) : IRequestHandler<GetQRV2Query, GetQRV2Response>
{
    public async Task<GetQRV2Response> Handle(GetQRV2Query request, CancellationToken cancellationToken)
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

        // 1. STARTSESSION (Đóng hàng)
        var sessionStart = new UserSessionQrContent(user.Id, user.DeskId, "STARTSESSION", cameras);
        
        // 2. STARTRETURNSESSION (Bóc hoàn)
        var sessionReturn = new UserSessionQrContent(user.Id, user.DeskId, "STARTRETURNSESSION", cameras);
        
        // 3. ENDORDER (Kết thúc)
        var sessionEnd = new UserSessionQrContent(user.Id, user.DeskId, "ENDORDER", cameras);

        var header = $"{user.FullName} - {desk?.Name ?? "N/A"}";

        return new GetQRV2Response
        {
            HeaderText = header,
            QrCodes =
            [
                new QrCodeItem 
                { 
                    Label = "Đóng hàng", 
                    JsonContent = JsonConvert.SerializeObject(sessionStart),
                    Color = "Blue"
                },
                new QrCodeItem 
                { 
                    Label = "Bóc hoàn", 
                    JsonContent = JsonConvert.SerializeObject(sessionReturn),
                    Color = "Green"
                },
                new QrCodeItem 
                { 
                    Label = "Kết thúc", 
                    JsonContent = JsonConvert.SerializeObject(sessionEnd),
                    Color = "Red"
                }
            ]
        };
    }
}
