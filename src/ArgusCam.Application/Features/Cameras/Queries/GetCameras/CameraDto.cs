namespace ArgusCam.Application.Features.Cameras.Queries.GetCameras;

public class CameraDto
{
    public Guid Id { get; set; }
    public string ProviderKey { get; set; } = default!;
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Image { get; set; }
    public string? Note { get; set; }
    public string? CameraIP { get; set; }
    public string? CameraChannel { get; set; }
    public string? Model { get; set; }
    public string? SerialNo { get; set; }
    public string? SoftwareVersion { get; set; }
    public int? SDKPort { get; set; }
    public string? DeviceType { get; set; }
    public Guid? DeskId { get; set; }
    public string? DeskName { get; set; }
    public DateTimeOffset CreatedOn { get; set; }
}
