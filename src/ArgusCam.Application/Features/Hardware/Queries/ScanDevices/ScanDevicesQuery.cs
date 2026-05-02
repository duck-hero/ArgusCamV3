using ArgusCam.Application.Common.Models;
using MediatR;

namespace ArgusCam.Application.Features.Hardware.Queries.ScanDevices;

public class ScanDevicesQuery : IRequest<ResponseData>
{
    public string? Username { get; set; }
    public string? Password { get; set; }
}
