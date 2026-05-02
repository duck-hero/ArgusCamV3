using FluentValidation;

namespace ArgusCam.Application.Features.Desks.Commands.StartSession;

/// <summary>
/// Validator cho StartSessionCommand.
/// Mục tiêu của validator là chặn sớm các dữ liệu đầu vào không hợp lệ trước khi vào handler,
/// giúp giảm lỗi nghiệp vụ và trả thông báo rõ ràng cho client.
/// </summary>
public class StartSessionCommandValidator : AbstractValidator<StartSessionCommand>
{
    /// <summary>
    /// Khởi tạo các rule validate cho request StartSession.
    /// Các rule tập trung vào hai định danh bắt buộc (UserId, DeskId) và chuẩn hóa ScannerCode.
    /// </summary>
    public StartSessionCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty()
            .WithMessage("UserId is required.");

        RuleFor(x => x.DeskId)
            .NotEmpty()
            .WithMessage("DeskId is required.");

        RuleFor(x => x.ScannerCode)
            .MaximumLength(200)
            .WithMessage("ScannerCode must not exceed 200 characters.");
    }
}
