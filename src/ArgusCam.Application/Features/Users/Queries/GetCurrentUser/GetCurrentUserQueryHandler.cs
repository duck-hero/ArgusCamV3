using Mapster;
using MediatR;
using Microsoft.AspNetCore.Identity;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Application.Features.Users.Queries.GetCurrentUser;

public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, ResponseData>
{
    private readonly ICurrentUserService _currentUserService;
    private readonly UserManager<User> _userManager;

    public GetCurrentUserQueryHandler(ICurrentUserService currentUserService, UserManager<User> userManager)
    {
        _currentUserService = currentUserService;
        _userManager = userManager;
    }

    public async Task<ResponseData> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (userId == null)
        {
            throw new UnauthorizedException("User is not logged in.");
        }

        var user = await _userManager.FindByIdAsync(userId.Value.ToString());
        if (user == null)
        {
            throw new NotFoundException("User not found.");
        }

        var roles = await _userManager.GetRolesAsync(user);

        var dto = user.Adapt<UserProfileDto>();
        dto.Roles = roles.ToList();

        return new ResponseData { Content = dto };
    }
}
