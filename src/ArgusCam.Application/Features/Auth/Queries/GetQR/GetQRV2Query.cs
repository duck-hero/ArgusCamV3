using MediatR;

namespace ArgusCam.Application.Features.Auth.Queries.GetQR;

public record GetQRV2Query(Guid UserId) : IRequest<GetQRV2Response>;