using MediatR;
using ArgusCam.Application.Features.Auth.Queries.GetQR;

namespace ArgusCam.Application.Features.Desks.Queries.GetEndOrderQR;

public record GetEndOrderQRQuery(Guid DeskId) : IRequest<SingleQrResponse>;