using MediatR;

namespace ArgusCam.Application.Features.Auth.Queries.GetQR;

public record GetQRQuery(Guid UserId) : IRequest<SingleQrResponse>;