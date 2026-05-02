using MediatR;
using Microsoft.AspNetCore.Identity;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Models;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Application.Features.Users.Commands.DeleteUser;

/// <summary>
/// Xử lý xóa mềm (Soft Delete) người dùng.
/// </summary>
public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, ResponseData>
{
    private readonly UserManager<User> _userManager;

    public DeleteUserCommandHandler(UserManager<User> userManager)
    {
        _userManager = userManager;
    }

    public async Task<ResponseData> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByIdAsync(request.Id.ToString());
        if (user == null)
        {
            throw new NotFoundException("Không tìm thấy người dùng.");
        }

        // Thực hiện Soft Delete (vì User implement ISoftDelete)
        user.IsDeleted = true;
        user.DeletedOn = DateTimeOffset.UtcNow;
        // user.DeletedBy = ... (Lấy current user nếu cần)

        // UpdateAsync sẽ trigger lưu xuống DB
        var result = await _userManager.UpdateAsync(user);

        if (!result.Succeeded)
        {
             var errors = string.Join(", ", result.Errors.Select(e => e.Description));
             throw new BadRequestException($"Lỗi xóa user: {errors}");
        }

        return new ResponseData
        {
            Content = true
        };
    }
}
