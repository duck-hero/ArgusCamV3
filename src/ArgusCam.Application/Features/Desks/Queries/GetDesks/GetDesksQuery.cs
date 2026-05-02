using MediatR;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Desks.Queries.GetDesks;

public class GetDesksQuery : CursorPaginationRequest, IRequest<ResponseData>
{
    public string? SearchTerm { get; set; }
}