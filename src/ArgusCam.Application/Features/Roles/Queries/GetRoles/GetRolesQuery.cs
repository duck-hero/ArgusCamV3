using Mapster;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Roles.Queries.GetRoles;

public class RoleDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
}

public class GetRolesQuery : IRequest<ResponseData>
{
}

public class GetRolesQueryHandler : IRequestHandler<GetRolesQuery, ResponseData>
{
    private readonly IApplicationDbContext _context;

    public GetRolesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ResponseData> Handle(GetRolesQuery request, CancellationToken cancellationToken)
    {
        var roles = await _context.Roles
            .AsNoTracking()
            .OrderBy(r => r.Name)
            .ProjectToType<RoleDto>()
            .ToListAsync(cancellationToken);

        return new ResponseData { Content = roles };
    }
}
