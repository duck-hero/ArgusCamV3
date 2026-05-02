using MediatR;
using ArgusCam.Application.Features.Auth.Common;

namespace ArgusCam.Application.Features.Auth.Commands.RefreshToken;

public record RefreshTokenCommand(string AccessToken, string RefreshToken) : IRequest<LoginResponse>;
