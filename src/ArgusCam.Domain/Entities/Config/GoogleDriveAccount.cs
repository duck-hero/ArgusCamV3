using ArgusCam.Domain.Common;

namespace ArgusCam.Domain.Entities.Config;

public class GoogleDriveAccount : BaseAuditableEntity<Guid>
{
    public string Email { get; set; } = default!;
    public string RefreshToken { get; set; } = default!;
    public string? AccessToken { get; set; }
    public DateTimeOffset? AccessTokenExpiresAt { get; set; }
    public string? FolderId { get; set; }
}
