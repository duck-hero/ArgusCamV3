using MediatR;
using ArgusCam.Application.Features.Auth.Common;

namespace ArgusCam.Application.Features.Auth.Commands.Register;

public record RegisterCommand(
    string FullName,
    string Email,
    string Password
) : IRequest<AuthenticationResult>;
