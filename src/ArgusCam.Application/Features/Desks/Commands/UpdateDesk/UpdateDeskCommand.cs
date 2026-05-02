using System.Text.Json.Serialization;
using MediatR;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;

namespace ArgusCam.Application.Features.Desks.Commands.UpdateDesk;

/// <summary>
/// Command cập nhật thông tin bàn làm việc.
/// </summary>
public record UpdateDeskCommand : IRequest
{
    [JsonIgnore]
    public Guid Id { get; set; }
    public string Name { get; init; } = default!;
    public string Code { get; init; } = default!;
    public string? Image { get; init; }
    public string? Note { get; init; }
    public bool IsPacking { get; init; }
}

public class UpdateDeskCommandHandler : IRequestHandler<UpdateDeskCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateDeskCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Xử lý cập nhật thông tin bàn.
    /// </summary>
    public async Task Handle(UpdateDeskCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Desks.FindAsync([request.Id], cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(Desks), request.Id);
        }

        entity.Name = request.Name;
        entity.Code = request.Code;
        entity.Image = request.Image;
        entity.Note = request.Note;
        entity.IsPacking = request.IsPacking;

        await _context.SaveChangesAsync(cancellationToken);
    }
}
