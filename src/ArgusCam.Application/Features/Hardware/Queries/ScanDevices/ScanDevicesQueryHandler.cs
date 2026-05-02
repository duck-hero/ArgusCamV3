using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;
using MediatR;

namespace ArgusCam.Application.Features.Hardware.Queries.ScanDevices;

public class ScanDevicesQueryHandler(IHardwareScanService scanService)
    : IRequestHandler<ScanDevicesQuery, ResponseData>
{
    public async Task<ResponseData> Handle(ScanDevicesQuery request, CancellationToken cancellationToken)
    {
        var devices = await scanService.ScanDevicesAsync(request.Username, request.Password, cancellationToken);
        return new ResponseData { Content = devices };
    }
}
