using MediatR;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Users.Commands.DeleteUser;

public class DeleteUserCommand : IRequest<ResponseData>
{
    public Guid Id { get; set; }
}
