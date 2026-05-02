using MediatR;
using Microsoft.AspNetCore.Identity;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Application.Features.Auth.Commands.ResetPassword;

public class ResetPasswordCommandHandler(UserManager<User> userManager) : IRequestHandler<ResetPasswordCommand, bool>
{
    public async Task<bool> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(request.UserId);
        if (user == null) throw new NotFoundException("User not found");

        var result = await userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        
        if (!result.Succeeded)
        {
             var errors = string.Join(", ", result.Errors.Select(e => e.Description));
             throw new BadRequestException(errors);
        }

        return true;
    }
}
