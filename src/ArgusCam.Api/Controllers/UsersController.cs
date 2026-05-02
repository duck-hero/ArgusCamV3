using Microsoft.AspNetCore.Mvc;
using ArgusCam.Application.Common.Models;
using ArgusCam.Application.Features.Auth.Queries.GetQR;
using ArgusCam.Application.Features.Users.Commands.CreateUser;
using ArgusCam.Application.Features.Users.Commands.DeleteUser;
using ArgusCam.Application.Features.Users.Commands.UpdateUser;
using ArgusCam.Application.Features.Users.Queries.GetUsers;

namespace ArgusCam.Api.Controllers;

[Route("api/users")]
public class UsersController : ApiController
{
    /// <summary>
    /// Lấy danh sách Người dùng (có phân trang Cursor).
    /// </summary>
    [HttpGet]
    // [Authorize(Roles = "Admin")] // Uncomment when roles are ready
    public async Task<ActionResult<ResponseData>> GetAll([FromQuery] GetUsersQuery query)
    {
        var result = await Mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới người dùng và gán quyền.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ResponseData>> Create(CreateUserCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin người dùng và quyền.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<ResponseData>> Update(Guid id, UpdateUserCommand command)
    {
        command.Id = id;
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Xóa người dùng (Soft Delete).
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ResponseData>> Delete(Guid id)
    {
        var result = await Mediator.Send(new DeleteUserCommand { Id = id });
        return Ok(result);
    }

    /// <summary>
    /// Lấy dữ liệu mã QR của một người dùng cụ thể.
    /// </summary>
    [HttpGet("{id}/qr")]
    public async Task<ActionResult<ResponseData>> GetQrByUserId(Guid id)
    {
        // Gọi trực tiếp GetQRV2Query để đảm bảo endpoint này dùng cùng một logic với Account/GetQRV2.
        var result = await Mediator.Send(new GetQRV2Query(id));
        return Ok(new ResponseData { Content = result });
    }
}
