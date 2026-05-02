namespace ArgusCam.Application.Features.Videos.Queries.GetVideos;

public class VideoDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = default!;
    public string VideoPath { get; set; } = default!;
    public string? Note { get; set; }
    public bool? IsConverted { get; set; }
    public bool IsPacking { get; set; }
    public Guid? CameraId { get; set; }
    public string? CameraName { get; set; }
    public Guid OrderId { get; set; }
    public string? OrderCode { get; set; }
    public DateTimeOffset CreatedOn { get; set; }
    public string? DriveFileId { get; set; }
    public string? DriveWebViewLink { get; set; }
    public DateTimeOffset? DriveSyncedAt { get; set; }
}
