using MediatR;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Orders.Queries.GetOrders;

public class GetOrdersQuery : CursorPaginationRequest, IRequest<ResponseData>
{
    public string? Code { get; set; }
    public int? Status { get; set; }
    public Guid? UserId { get; set; }
    public bool? IsPacking { get; set; }
    public DateTime? StartFrom { get; set; }
    public DateTime? StartTo { get; set; }
}
