using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ArgusCam.Application.Common.Models;
using ArgusCam.Application.Features.Orders.Commands.CreateOrder;
using ArgusCam.Application.Features.Orders.Commands.EndOrder;
using ArgusCam.Application.Features.Orders.Queries.GetOrders;

namespace ArgusCam.Api.Controllers.VideoStore;

/// <summary>
/// Controller quản lý đơn hàng.
/// </summary>
[Route("api/orders")]
public class OrdersController : ApiController
{
    /// <summary>
    /// API lấy danh sách đơn hàng có phân trang.
    /// </summary>
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<ResponseData>> GetAll([FromQuery] GetOrdersQuery query)
    {
        var result = await Mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// API tạo mới đơn hàng.
    /// Đầu vào chính:
    /// - Start (Unix timestamp)
    /// - OrderCode
    /// - DeskId
    /// - IsPacking
    /// - Cameras (danh sách camera)
    /// </summary>
    [HttpPost("create-new-order")]
    public async Task<ActionResult<ResponseData>> CreateNewOrder([FromBody] CreateOrderCommand command)
    {
        // Đẩy toàn bộ nghiệp vụ xử lý xuống command handler để đảm bảo logic nhất quán.
        var id = await Mediator.Send(command);

        return Ok(new ResponseData
        {
            Content = new
            {
                Status = true,
                Id = id
            }
        });
    }

    /// <summary>
    /// API kết thúc đơn hàng.
    /// Đầu vào:
    /// - OrderId
    /// - End (Unix timestamp)
    /// </summary>
    [HttpPost("end-order")]
    public async Task<ActionResult<ResponseData>> EndOrder([FromBody] EndOrderCommand command)
    {
        // Xử lý kết thúc đơn hàng tại handler.
        await Mediator.Send(command);

        return Ok(new ResponseData { Content = new { Status = true } });
    }
}
