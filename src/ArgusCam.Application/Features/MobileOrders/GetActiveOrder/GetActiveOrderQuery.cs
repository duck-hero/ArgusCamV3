using ArgusCam.Application.Common.Models;
using MediatR;

namespace ArgusCam.Application.Features.MobileOrders.GetActiveOrder;

public record GetActiveOrderQuery : IRequest<ResponseData>;
