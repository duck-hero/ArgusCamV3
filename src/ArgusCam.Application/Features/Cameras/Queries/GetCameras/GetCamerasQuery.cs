using MediatR;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Cameras.Queries.GetCameras;

public class GetCamerasQuery : CursorPaginationRequest, IRequest<ResponseData>
{
    public string? SearchTerm { get; set; }
    public Guid? DeskId { get; set; }
}
