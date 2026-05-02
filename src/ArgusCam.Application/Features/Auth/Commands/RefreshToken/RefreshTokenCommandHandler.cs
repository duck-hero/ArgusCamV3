using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Features.Auth.Common;
using ArgusCam.Domain.Entities.Identity;
using System.Security.Claims;

namespace ArgusCam.Application.Features.Auth.Commands.RefreshToken;

public class RefreshTokenCommandHandler(
    IApplicationDbContext context,
    UserManager<User> userManager,
    IJwtTokenGenerator jwtTokenGenerator) : IRequestHandler<RefreshTokenCommand, LoginResponse>
{
    public async Task<LoginResponse> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var principal = jwtTokenGenerator.GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal == null)
        {
            throw new UnauthorizedException("Invalid access token");
        }

        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
        var sessionId = principal.FindFirstValue("sid");

        var user = await userManager.FindByIdAsync(userId!);
        if (user == null)
        {
            throw new UnauthorizedException("User not found");
        }

        if (string.IsNullOrWhiteSpace(sessionId) ||
            string.IsNullOrWhiteSpace(user.CurrentSessionId) ||
            !string.Equals(user.CurrentSessionId, sessionId, StringComparison.Ordinal))
        {
            throw new UnauthorizedException("This login session is no longer active.");
        }

        // Check Refresh Token in DB
        var storedRefreshToken = await context.RefreshTokens
            .FirstOrDefaultAsync(x => x.Token == request.RefreshToken, cancellationToken);

        if (storedRefreshToken == null)
        {
            throw new UnauthorizedException("Refresh token does not exist");
        }

        if (storedRefreshToken.ExpiryDate < DateTime.UtcNow)
        {
            throw new UnauthorizedException("Refresh token has expired");
        }

        if (storedRefreshToken.Invalidated)
        {
            throw new UnauthorizedException("Refresh token has been invalidated");
        }

        if (storedRefreshToken.Used)
        {
            throw new UnauthorizedException("Refresh token has been used");
        }

        if (storedRefreshToken.UserId != user.Id ||
            !string.Equals(storedRefreshToken.JwtId, sessionId, StringComparison.Ordinal))
        {
            throw new UnauthorizedException("Refresh token does not belong to the current session.");
        }

        // Mark as used
        storedRefreshToken.Used = true;
        context.RefreshTokens.Update(storedRefreshToken);

        // Generate new pair
        var roles = await userManager.GetRolesAsync(user);
        var newAccessToken = jwtTokenGenerator.GenerateToken(user, [.. roles], sessionId);
        var newRefreshToken = jwtTokenGenerator.GenerateRefreshToken();

        var newRefreshTokenEntity = new ArgusCam.Domain.Entities.Identity.RefreshToken
        {
            JwtId = sessionId,
            Token = newRefreshToken,
            CreationDate = DateTime.UtcNow,
            ExpiryDate = DateTime.UtcNow.AddMonths(1), // Long lived
            UserId = user.Id
        };

        context.RefreshTokens.Add(newRefreshTokenEntity);
        await context.SaveChangesAsync(cancellationToken);

        return new LoginResponse(
            user.IsUse2FA,
            newAccessToken,
            null,
            newRefreshToken,
            user.Id,
            user.FullName ?? "",
            [.. roles]
        );
    }
}
