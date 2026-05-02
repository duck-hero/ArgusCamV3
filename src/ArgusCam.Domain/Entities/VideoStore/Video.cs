using ArgusCam.Domain.Common;

namespace ArgusCam.Domain.Entities.VideoStore;

public class Video : BaseAuditableEntity<Guid>
{
    public string Code { get; set; } = default!;
    public string VideoPath { get; set; } = default!;
    public string? Note { get; set; }
    public bool? IsConverted { get; set; }
    public bool IsPacking { get; set; } = true;

    public string? DriveFileId { get; set; }
    public string? DriveWebViewLink { get; set; }
    public DateTimeOffset? DriveSyncedAt { get; set; }

    public Guid? CameraId { get; set; }
    public virtual Camera? Camera { get; set; }

    public Guid OrderId { get; set; }
    public virtual Order? Order { get; set; }
}
