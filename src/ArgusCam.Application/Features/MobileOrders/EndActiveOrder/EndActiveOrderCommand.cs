using ArgusCam.Application.Common.Models;
using MediatR;

namespace ArgusCam.Application.Features.MobileOrders.EndActiveOrder;

public record EndActiveOrderCommand : IRequest<ResponseData>;
