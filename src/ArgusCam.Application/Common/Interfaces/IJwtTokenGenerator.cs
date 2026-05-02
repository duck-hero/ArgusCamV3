using System.Security.Claims;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user, List<string> roles, string? sessionId = null);
    string GenerateRefreshToken();
    ClaimsPrincipal? GetPrincipalFromExpiredToken(string? token);
}
