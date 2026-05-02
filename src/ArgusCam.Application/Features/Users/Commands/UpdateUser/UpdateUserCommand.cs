using MediatR;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Users.Commands.UpdateUser;

public class UpdateUserCommand : IRequest<ResponseData>
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = default!;
    public string? PhoneNumber { get; set; }
    public bool Status { get; set; }
    public Guid? DeskId { get; set; }
    public List<Guid> RoleIds { get; set; } = []; // Danh sách Role ID mới (sẽ replace list cũ)
}