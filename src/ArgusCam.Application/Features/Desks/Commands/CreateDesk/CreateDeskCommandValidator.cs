using FluentValidation;

namespace ArgusCam.Application.Features.Desks.Commands.CreateDesk;

public class CreateDeskCommandValidator : AbstractValidator<CreateDeskCommand>
{
    public CreateDeskCommandValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Code is required.")
            .MaximumLength(50);

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(100);
    }
}
