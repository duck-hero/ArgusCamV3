using ArgusCam.Application.Common.Models;
using ArgusCam.Application.Features.Hardware.Queries.ScanDevices;
using Microsoft.AspNetCore.Mvc;

namespace ArgusCam.Api.Controllers;

[Route("api/hardware")]
public class HardwareController : ApiController
{
    [HttpGet("scan")]
    public async Task<ActionResult<ResponseData>> Scan(
        [FromQuery] string? username,
        [FromQuery] string? password,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new ScanDevicesQuery { Username = username, Password = password }, cancellationToken);
        return Ok(result);
    }
}
