using MediatR;
using Microsoft.AspNetCore.Identity;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Domain.Entities.Identity;

using ArgusCam.Application.Common.Exceptions;

namespace ArgusCam.Application.Features.Auth.Commands.ChangePassword;

public class ChangePasswordCommandHandler(
    UserManager<User> userManager,
    ICurrentUserService currentUserService) : IRequestHandler<ChangePasswordCommand, bool>
{
    public async Task<bool> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var userId = currentUserService.UserId;
        if (userId == null)
        {
            throw new UnauthorizedException("User not found");
        }

        var user = await userManager.FindByIdAsync(userId.Value.ToString());
        if (user == null)
        {
            throw new UnauthorizedException("User not found");
        }

        var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new BadRequestException(errors);
        }

        return true;
    }
}
