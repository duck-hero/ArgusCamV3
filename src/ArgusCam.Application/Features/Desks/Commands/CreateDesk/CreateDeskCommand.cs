using MediatR;

namespace ArgusCam.Application.Features.Desks.Commands.CreateDesk;

public record CreateDeskCommand(
    string Code,
    string Name,
    string? Note,
    bool IsPacking
) : IRequest<Guid>;
