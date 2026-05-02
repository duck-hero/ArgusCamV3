using Microsoft.AspNetCore.Mvc;
using ArgusCam.Api.Controllers;
using ArgusCam.Application.Common.Models;
using ArgusCam.Application.Features.Cameras.Commands.CreateCamera;
using ArgusCam.Application.Features.Cameras.Commands.UpdateCamera;
using ArgusCam.Application.Features.Cameras.Commands.DeleteCamera;
using ArgusCam.Application.Features.Cameras.Queries.GetCameras;

namespace ArgusCam.Api.Controllers.VideoStore;

/// <summary>
/// Controller quản lý Camera.
/// </summary>
[Route("api/cameras")]
public class CamerasController : ApiController
{
    /// <summary>
    /// Lấy danh sách Camera (có phân trang Cursor).
    /// </summary>
    /// <param name="query">Tham số lọc và phân trang</param>
    /// <returns>Danh sách Camera</returns>
    [HttpGet]
    public async Task<ActionResult<ResponseData>> GetAll([FromQuery] GetCamerasQuery query)
    {
        var result = await Mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới Camera.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ResponseData>> Create(CreateCameraCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin Camera.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<ResponseData>> Update(Guid id, UpdateCameraCommand command)
    {
        command.Id = id;
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Xóa Camera (Soft Delete).
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ResponseData>> Delete(Guid id)
    {
        var result = await Mediator.Send(new DeleteCameraCommand { Id = id });
        return Ok(result);
    }
}