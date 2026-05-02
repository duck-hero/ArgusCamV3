using MediatR;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Users.Queries.GetUsers;

public class GetUsersQuery : CursorPaginationRequest, IRequest<ResponseData>
{
    public string? SearchTerm { get; set; }
    public bool? Status { get; set; }
}
