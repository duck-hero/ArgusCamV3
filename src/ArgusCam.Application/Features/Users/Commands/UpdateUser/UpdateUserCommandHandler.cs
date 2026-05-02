using MediatR;
using Microsoft.AspNetCore.Identity;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Models;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Application.Features.Users.Commands.UpdateUser;

/// <summary>
/// Xử lý cập nhật thông tin người dùng và quyền hạn.
/// </summary>
public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, ResponseData>
{
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<Role> _roleManager;

    public UpdateUserCommandHandler(UserManager<User> userManager, RoleManager<Role> roleManager)
    {
        _userManager = userManager;
        _roleManager = roleManager;
    }

    public async Task<ResponseData> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(request.Id.ToString());
        if (user == null)
        {
            throw new NotFoundException("User", request.Id);
        }

        // 1. Cập nhật thông tin cơ bản
        user.FullName = request.FullName;
        user.PhoneNumber = request.PhoneNumber;
        user.Status = request.Status;
        user.DeskId = request.DeskId;
        user.LastModifiedOn = DateTimeOffset.UtcNow;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
             var errors = string.Join(", ", updateResult.Errors.Select(e => e.Description));
             throw new BadRequestException($"Lỗi cập nhật user: {errors}");
        }

        // 2. Cập nhật Roles
        // Nếu danh sách RoleIds được truyền lên (kể cả rỗng, nghĩa là muốn xóa hết quyền), thì thực hiện sync.
        if (request.RoleIds != null)
        {
            // Lấy roles hiện tại
            var currentRoles = await _userManager.GetRolesAsync(user);
            
            // Xóa hết role cũ
            if (currentRoles.Any())
            {
                await _userManager.RemoveFromRolesAsync(user, currentRoles);
            }

            // Thêm role mới
            if (request.RoleIds.Any())
            {
                foreach (var roleId in request.RoleIds)
                {
                    var role = await _roleManager.FindByIdAsync(roleId.ToString());
                    if (role != null && role.Name != null)
                    {
                        await _userManager.AddToRoleAsync(user, role.Name);
                    }
                }
            }
        }

        return new ResponseData
        {
            Content = user.Id
        };
    }
}
