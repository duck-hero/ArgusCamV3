using MediatR;
using Microsoft.AspNetCore.Identity;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Models;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Application.Features.Users.Commands.CreateUser;

/// <summary>
/// Xử lý tạo người dùng mới và gán quyền.
/// </summary>
public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, ResponseData>
{
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<Role> _roleManager;

    public CreateUserCommandHandler(UserManager<User> userManager, RoleManager<Role> roleManager)
    {
        _userManager = userManager;
        _roleManager = roleManager;
    }

    public async Task<ResponseData> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        // 1. Kiểm tra tồn tại
        var existingUser = await _userManager.FindByNameAsync(request.UserName);
        if (existingUser != null)
        {
            throw new BadRequestException("Tên đăng nhập đã tồn tại.");
        }

        var existingEmail = await _userManager.FindByEmailAsync(request.Email);
        if (existingEmail != null)
        {
            throw new BadRequestException("Email đã được sử dụng.");
        }

        // 2. Tạo User entity
        var newUser = new User
        {
            UserName = request.UserName,
            Email = request.Email,
            FullName = request.FullName,
            PhoneNumber = request.PhoneNumber,
            Status = true,
            CreatedOn = DateTimeOffset.UtcNow
        };

        // 3. Insert vào DB
        var result = await _userManager.CreateAsync(newUser, request.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new BadRequestException($"Lỗi tạo user: {errors}");
        }

        // 4. Gán Role theo danh sách RoleIds
        if (request.RoleIds != null && request.RoleIds.Any())
        {
            foreach (var roleId in request.RoleIds)
            {
                var role = await _roleManager.FindByIdAsync(roleId.ToString());
                if (role != null && role.Name != null)
                {
                    await _userManager.AddToRoleAsync(newUser, role.Name);
                }
            }
        }

        return new ResponseData
        {
            Content = newUser.Id
        };
    }
}
