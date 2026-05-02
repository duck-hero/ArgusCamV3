using ArgusCam.Application.Common.Models;
using ArgusCam.Application.Features.MobileOrders.EndActiveOrder;
using ArgusCam.Application.Features.MobileOrders.GetActiveOrder;
using ArgusCam.Application.Features.MobileOrders.ScanOrder;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ArgusCam.Api.Controllers.VideoStore;

[Authorize]
[Route("api/mobile-orders")]
public class MobileOrdersController : ApiController
{
    [HttpGet("active")]
    public async Task<ActionResult<ResponseData>> GetActive(CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetActiveOrderQuery(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("scan")]
    public async Task<ActionResult<ResponseData>> Scan([FromBody] ScanOrderCommand command, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpPost("end-active")]
    public async Task<ActionResult<ResponseData>> EndActive(CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new EndActiveOrderCommand(), cancellationToken);
        return Ok(result);
    }
}
