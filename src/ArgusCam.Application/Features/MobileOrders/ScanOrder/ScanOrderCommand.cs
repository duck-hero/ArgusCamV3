using ArgusCam.Application.Common.Models;
using MediatR;

namespace ArgusCam.Application.Features.MobileOrders.ScanOrder;

public record ScanOrderCommand : IRequest<ResponseData>
{
    public string OrderCode { get; init; } = string.Empty;
}
