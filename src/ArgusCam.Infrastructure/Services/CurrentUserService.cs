using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using ArgusCam.Application.Common.Interfaces;

namespace ArgusCam.Infrastructure.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public Guid? UserId
    {
        get
        {
            var userIdClaim = httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier) 
                             ?? httpContextAccessor.HttpContext?.User?.FindFirstValue("sub");
            
            if (Guid.TryParse(userIdClaim, out var guid))
            {
                return guid;
            }
            return null;
        }
    }
}
