using MediatR;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Videos.Queries.GetVideos;

public class GetVideosQuery : IRequest<ResponseData>
{
    public Guid? OrderId { get; set; }
    public bool? IsPacking { get; set; }
}
