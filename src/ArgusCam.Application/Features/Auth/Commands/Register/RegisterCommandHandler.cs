using MediatR;
using Microsoft.AspNetCore.Identity;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Features.Auth.Common;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Application.Features.Auth.Commands.Register;

public class RegisterCommandHandler(
    UserManager<User> userManager,
    IJwtTokenGenerator jwtTokenGenerator) 
    : IRequestHandler<RegisterCommand, AuthenticationResult>
{
    public async Task<AuthenticationResult> Handle(RegisterCommand command, CancellationToken cancellationToken)
    {
        // 1. Validate if user exists (Optional, UserManager handles it but good to check)
        var existingUser = await userManager.FindByEmailAsync(command.Email);
        if (existingUser is not null)
        {
            throw new BadRequestException("User with this email already exists.");
        }

        // 2. Create User
        var user = new User
        {
            UserName = command.Email,
            Email = command.Email,
            FullName = command.FullName
        };

        var result = await userManager.CreateAsync(user, command.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new BadRequestException($"Registration failed: {errors}");
        }

        // 3. Generate Token
        var sessionId = Guid.NewGuid().ToString("N");
        user.CurrentSessionId = sessionId;
        await userManager.UpdateAsync(user);

        var token = jwtTokenGenerator.GenerateToken(user, [], sessionId);

        return new AuthenticationResult(
            user.Id,
            user.FullName ?? "",
            "",
            user.Email!,
            token);
    }
}
