using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Features.Desks.Queries.GetDesks;

namespace ArgusCam.Application.Features.Desks.Queries.GetDesks;

public record GetDeskLookupQuery : IRequest<List<DeskDto>>;

public class GetDeskLookupQueryHandler(IApplicationDbContext context) : IRequestHandler<GetDeskLookupQuery, List<DeskDto>>
{
    public async Task<List<DeskDto>> Handle(GetDeskLookupQuery request, CancellationToken cancellationToken)
    {
        // Simple lookup, reusing DeskDto
        return await context.Desks
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .Select(x => new DeskDto(x.Id, x.Code, x.Name, x.Note, x.IsPacking, x.CurrentScannerCode, x.CreatedOn))
            .ToListAsync(cancellationToken);
    }
}
