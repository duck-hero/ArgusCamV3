using Microsoft.AspNetCore.Mvc;
using ArgusCam.Application.Common.Models;
using ArgusCam.Application.Features.Roles.Queries.GetRoles;

namespace ArgusCam.Api.Controllers;

[Route("api/roles")]
// [Authorize(Roles = "Admin")] // Uncomment when ready
public class RolesController : ApiController
{
    [HttpGet]
    public async Task<ActionResult<ResponseData>> GetAll()
    {
        var result = await Mediator.Send(new GetRolesQuery());
        return Ok(result);
    }
}
