namespace ArgusCam.Application.Features.Desks.Queries.GetDesks;

public record DeskDto(
    Guid Id,
    string Code,
    string Name,
    string? Note,
    bool IsPacking,
    string? CurrentScannerCode,
    DateTimeOffset CreatedOn
);