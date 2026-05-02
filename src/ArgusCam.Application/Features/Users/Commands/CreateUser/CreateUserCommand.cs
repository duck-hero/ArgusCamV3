using FluentValidation;
using MediatR;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Users.Commands.CreateUser;

public class CreateUserCommand : IRequest<ResponseData>
{
    public string UserName { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string Password { get; set; } = default!;
    public string FullName { get; set; } = default!;
    public string? PhoneNumber { get; set; }
    public List<Guid> RoleIds { get; set; } = []; // Danh sách Role ID được chọn
}

public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.UserName).NotEmpty().WithMessage("Tên đăng nhập không được để trống.");
        RuleFor(x => x.Email).NotEmpty().EmailAddress().WithMessage("Email không hợp lệ.");
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6).WithMessage("Mật khẩu phải từ 6 ký tự.");
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Họ tên không được để trống.");
    }
}