using MediatR;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Domain.Entities.VideoStore;

namespace ArgusCam.Application.Features.Desks.Commands.CreateDesk;

public class CreateDeskCommandHandler(IApplicationDbContext context) : IRequestHandler<CreateDeskCommand, Guid>
{
    public async Task<Guid> Handle(CreateDeskCommand command, CancellationToken cancellationToken)
    {
        var desk = new Desk
        {
            Code = command.Code,
            Name = command.Name,
            Note = command.Note,
            IsPacking = command.IsPacking,
            // Audit fields are handled by DbContext Interceptor/Override
        };

        context.Desks.Add(desk);
        await context.SaveChangesAsync(cancellationToken);

        return desk.Id;
    }
}
