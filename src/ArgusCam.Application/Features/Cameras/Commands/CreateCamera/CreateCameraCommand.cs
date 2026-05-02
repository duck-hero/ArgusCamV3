using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;
using ArgusCam.Application.Common.Models.CameraProviders;
using ArgusCam.Domain.Entities.VideoStore;

namespace ArgusCam.Application.Features.Cameras.Commands.CreateCamera;

public class CreateCameraCommand : IRequest<ResponseData>
{
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

public class CreateCameraCommandValidator : AbstractValidator<CreateCameraCommand>
{
    public CreateCameraCommandValidator()
    {
        RuleFor(x => x.ProviderKey).NotEmpty().WithMessage("Hang camera khong duoc de trong.");
        RuleFor(x => x.Code).NotEmpty().WithMessage("Ma camera khong duoc de trong.");
        RuleFor(x => x.Name).NotEmpty().WithMessage("Ten camera khong duoc de trong.");
    }
}

public class CreateCameraCommandHandler : IRequestHandler<CreateCameraCommand, ResponseData>
{
    private readonly IApplicationDbContext _context;

    public CreateCameraCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ResponseData> Handle(CreateCameraCommand request, CancellationToken cancellationToken)
    {
        if (await _context.Cameras.AnyAsync(x => x.Code == request.Code, cancellationToken))
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

        var entity = new Camera
        {
            ProviderKey = CameraProviderKeys.Normalize(request.ProviderKey),
            Code = request.Code,
            Name = request.Name,
            Image = request.Image,
            Note = request.Note,
            CameraIP = request.CameraIP,
            CameraChannel = request.CameraChannel,
            Model = request.Model,
            SerialNo = request.SerialNo,
            SoftwareVersion = request.SoftwareVersion,
            SDKPort = request.SDKPort,
            DeviceType = request.DeviceType,
            DeskId = request.DeskId
        };

        _context.Cameras.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return new ResponseData { Content = entity.Id };
    }
}
