using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Desks.Commands.DeleteDesk;

public class DeleteDeskCommand : IRequest<ResponseData>
{
    public Guid Id { get; set; }
}

public class DeleteDeskCommandHandler : IRequestHandler<DeleteDeskCommand, ResponseData>
{
    private readonly IApplicationDbContext _context;

    public DeleteDeskCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ResponseData> Handle(DeleteDeskCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Desks
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException("Desk không tồn tại.");

        // Dùng ExecuteDeleteAsync để bypass change tracker — tránh bị UpdateAuditFields() intercept
        // và chuyển thành soft delete (vì Desk kế thừa ISoftDelete qua BaseAuditableEntity).
        // Camera.DeskId được cấu hình OnDelete(SetNull) ở DB nên camera không bị xóa theo.
        await _context.Desks.Where(x => x.Id == request.Id).ExecuteDeleteAsync(cancellationToken);

        return new ResponseData { Content = true };
    }
}
