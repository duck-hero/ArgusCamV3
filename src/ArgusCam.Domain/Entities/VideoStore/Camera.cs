using ArgusCam.Domain.Common;

namespace ArgusCam.Domain.Entities.VideoStore;

public class Camera : BaseAuditableEntity<Guid>
{
    public string ProviderKey { get; set; } = "hikvision";
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Image { get; set; }
    public string? Note { get; set; }
    public string? CameraIP { get; set; }
    public string? CameraChannel { get; set; }

    // Hardware info (from SADP scan)
    public string? Model { get; set; }
    public string? SerialNo { get; set; }
    public string? SoftwareVersion { get; set; }
    public int? SDKPort { get; set; }
    public string? DeviceType { get; set; }

    public Guid? DeskId { get; set; }
    public virtual Desk? Desk { get; set; }

    public virtual ICollection<OrderCamera> OrderCameras { get; set; } = [];
}
