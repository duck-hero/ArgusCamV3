using MediatR;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Users.Commands.UpdateProfile;

public class UpdateProfileCommand : IRequest<ResponseData>
{
    public string FullName { get; set; } = default!;
    public string? PhoneNumber { get; set; }
    // Add other self-updateable fields here if any
}
