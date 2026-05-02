using ArgusCam.Application.Features.Hardware.Queries.ScanDevices;

namespace ArgusCam.Application.Common.Interfaces;

public interface IHardwareScanService
{
    Task<List<ScannedDeviceDto>> ScanDevicesAsync(
        string? username = null,
        string? password = null,
        CancellationToken cancellationToken = default);
}
