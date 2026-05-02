using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Cameras.Commands.DeleteCamera;

public class DeleteCameraCommand : IRequest<ResponseData>
{
    public Guid Id { get; set; }
}

public class DeleteCameraCommandHandler : IRequestHandler<DeleteCameraCommand, ResponseData>
{
    private readonly IApplicationDbContext _context;

    public DeleteCameraCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ResponseData> Handle(DeleteCameraCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Cameras
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException("Camera not found");
        }

        // Dùng ExecuteDeleteAsync để bypass change tracker — tránh bị UpdateAuditFields() intercept
        // và chuyển thành soft delete (vì Camera kế thừa ISoftDelete qua BaseAuditableEntity).
        await _context.Cameras.Where(x => x.Id == request.Id).ExecuteDeleteAsync(cancellationToken);

        return new ResponseData { Content = true };
    }
}
