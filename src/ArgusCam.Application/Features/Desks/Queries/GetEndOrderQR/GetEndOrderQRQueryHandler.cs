using MediatR;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Features.Auth.Queries.GetQR;

namespace ArgusCam.Application.Features.Desks.Queries.GetEndOrderQR;

public class GetEndOrderQRQueryHandler(
    IApplicationDbContext context) : IRequestHandler<GetEndOrderQRQuery, SingleQrResponse>
{
    public async Task<SingleQrResponse> Handle(GetEndOrderQRQuery request, CancellationToken cancellationToken)
    {
        var desk = await context.Desks
            .FirstOrDefaultAsync(d => d.Id == request.DeskId, cancellationToken);
            
        if (desk == null) throw new NotFoundException("Desk not found");

        var content = new
        {
            DeskId = desk.Id,
            Command = "ENDORDER"
        };

        return new SingleQrResponse
        {
            Label = desk.Name,
            JsonContent = JsonConvert.SerializeObject(content)
        };
    }
}
