using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ArgusCam.Application.Common.Models;
using ArgusCam.Application.Features.Dashboard.Queries.GetDashboardStatistics;

namespace ArgusCam.Api.Controllers;

[Authorize]
[Route("api/dashboard")]
public class DashboardController : ApiController
{
    [HttpGet("statistics")]
    public async Task<ActionResult<ResponseData>> GetStatistics([FromQuery] GetDashboardStatisticsQuery query)
    {
        var result = await Mediator.Send(query);
        return Ok(result);
    }
}
