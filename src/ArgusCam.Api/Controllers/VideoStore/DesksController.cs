using Microsoft.AspNetCore.Mvc;
using ArgusCam.Application.Common.Models;
using ArgusCam.Application.Features.Desks.Commands.CreateDesk;
using ArgusCam.Application.Features.Desks.Commands.StartSession;
using ArgusCam.Application.Features.Desks.Commands.DeleteDesk;
using ArgusCam.Application.Features.Desks.Commands.UpdateDesk;
using ArgusCam.Application.Features.Desks.Queries.GetDesks;
using ArgusCam.Application.Features.Desks.Queries.GetEndOrderQR;

namespace ArgusCam.Api.Controllers.VideoStore;

/// <summary>
/// Controller quan ly Desk.
/// </summary>
[Route("api/desks")]
public class DesksController : ApiController
{
    /// <summary>
    /// Lay danh sach Desk theo bo loc va phan trang.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ResponseData>> GetAll([FromQuery] GetDesksQuery query)
    {
        var result = await Mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Lay danh sach Desk dang lookup don gian.
    /// </summary>
    [HttpGet("lookup")]
    public async Task<ActionResult<ResponseData>> GetLookup()
    {
        var result = await Mediator.Send(new GetDeskLookupQuery());
        return Ok(new ResponseData { Content = result });
    }

    /// <summary>
    /// Tao moi Desk.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ResponseData>> Create(CreateDeskCommand command)
    {
        var id = await Mediator.Send(command);
        return Ok(new ResponseData { Content = id });
    }

    /// <summary>
    /// Cap nhat thong tin co ban cua Desk.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<ResponseData>> Update(Guid id, UpdateDeskCommand command)
    {
        command.Id = id;
        await Mediator.Send(command);
        return Ok(new ResponseData { Content = new { Status = true } });
    }

    /// <summary>
    /// Xoa Desk (hard delete). Camera thuoc desk se duoc set DeskId = null.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ResponseData>> Delete(Guid id)
    {
        var result = await Mediator.Send(new DeleteDeskCommand { Id = id });
        return Ok(result);
    }

    /// <summary>
    /// Bat dau phien lam viec tai Desk.
    /// API nhan body gom ScannerCode, UserId, DeskId, IsPacking.
    /// Sau khi nhan request, API se goi handler de tim dung Desk theo DeskId
    /// va cap nhat thong tin phien hien tai cua ban.
    /// </summary>
    [HttpPost("start-session")]
    public async Task<ActionResult<ResponseData>> StartSession([FromBody] StartSessionCommand command)
    {
        // Chuyen command xuong tang Application de xu ly nghiep vu cap nhat Desk.
        // Tra ket qua Status theo gia tri thuc te handler tra ve.
        var isSuccess = await Mediator.Send(command);
        return Ok(new ResponseData { Content = new { Status = isSuccess } });
    }

    /// <summary>
    /// Lay du lieu QR de ket thuc don hang tai Desk.
    /// </summary>
    [HttpGet("{id}/end-order-qr")]
    public async Task<ActionResult<ResponseData>> GetEndOrderQR(Guid id)
    {
        var qrData = await Mediator.Send(new GetEndOrderQRQuery(id));
        return Ok(new ResponseData { Content = qrData });
    }
}