using ArgusCam.Domain.Common;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Domain.Entities.VideoStore;

public class Desk : BaseAuditableEntity<Guid>
{
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? CurrentScannerCode { get; set; }
    public string? EndOrderCode { get; set; }
    public string? Image { get; set; }
    public string? Note { get; set; }
    public bool IsPacking { get; set; } = true;

    public Guid? CurrentUserId { get; set; }
    public virtual User? CurrentUser { get; set; }

    public virtual ICollection<Camera> Cameras { get; set; } = [];
}
