using FluentValidation;

namespace ArgusCam.Application.Features.Desks.Commands.UpdateDesk;

public class UpdateDeskCommandValidator : AbstractValidator<UpdateDeskCommand>
{
    public UpdateDeskCommandValidator()
    {
        RuleFor(v => v.Id)
            .NotEmpty().WithMessage("ID bàn không được để trống.");

        RuleFor(v => v.Name)
            .NotEmpty().WithMessage("Tên bàn không được để trống.")
            .MaximumLength(200).WithMessage("Tên bàn không được vượt quá 200 ký tự.");

        RuleFor(v => v.Code)
            .NotEmpty().WithMessage("Mã bàn không được để trống.")
            .MaximumLength(50).WithMessage("Mã bàn không được vượt quá 50 ký tự.");
    }
}
