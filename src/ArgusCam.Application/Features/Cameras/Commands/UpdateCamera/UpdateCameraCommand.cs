using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;
using ArgusCam.Application.Common.Models.CameraProviders;

namespace ArgusCam.Application.Features.Cameras.Commands.UpdateCamera;

public class UpdateCameraCommand : IRequest<ResponseData>
{
    public Guid Id { get; set; }
    public string ProviderKey { get; set; } = CameraProviderKeys.Hikvision;
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Image { get; set; }
    public string? Note { get; set; }
    public string? CameraIP { get; set; }
    public string? CameraChannel { get; set; }
    public string? Model { get; set; }
    public string? SerialNo { get; set; }
    public string? SoftwareVersion { get; set; }
    public int? SDKPort { get; set; }
    public string? DeviceType { get; set; }
    public Guid? DeskId { get; set; }
}

public class UpdateCameraCommandHandler : IRequestHandler<UpdateCameraCommand, ResponseData>
{
    private readonly IApplicationDbContext _context;

    public UpdateCameraCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ResponseData> Handle(UpdateCameraCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Cameras
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException("Camera not found");
        }

        if (entity.Code != request.Code && await _context.Cameras.AnyAsync(x => x.Code == request.Code, cancellationToken))
        {
            throw new BadRequestException("Ma camera da ton tai.");
        }

        if (request.DeskId.HasValue)
        {
            var deskExists = await _context.Desks.AnyAsync(x => x.Id == request.DeskId, cancellationToken);
            if (!deskExists)
            {
                throw new NotFoundException("Ban lam viec khong ton tai.");
            }
        }

        entity.ProviderKey = CameraProviderKeys.Normalize(request.ProviderKey);
        entity.Code = request.Code;
        entity.Name = request.Name;
        entity.Image = request.Image;
        entity.Note = request.Note;
        entity.CameraIP = request.CameraIP;
        entity.CameraChannel = request.CameraChannel;
        entity.Model = request.Model;
        entity.SerialNo = request.SerialNo;
        entity.SoftwareVersion = request.SoftwareVersion;
        entity.SDKPort = request.SDKPort;
        entity.DeviceType = request.DeviceType;
        entity.DeskId = request.DeskId;

        await _context.SaveChangesAsync(cancellationToken);

        return new ResponseData { Content = entity.Id };
    }
}
