using MediatR;
using ArgusCam.Application.Features.Auth.Common;

namespace ArgusCam.Application.Features.Auth.Commands.Login;

public record LoginCommand(
    string UserName,
    string Password
) : IRequest<LoginResponse>;
