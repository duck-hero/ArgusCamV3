using ArgusCam.Domain.Entities.VideoStore;

namespace ArgusCam.Application.Common.Models.CameraProviders;

public sealed class CameraDownloadRequest
{
    public required string OrderId { get; init; }
    public required Guid OrderGuid { get; init; }
    public required string OrderCode { get; init; }
    public required Camera Camera { get; init; }
    public required uint CameraChannel { get; init; }
    public required DateTime Start { get; init; }
    public required DateTime End { get; init; }
    public bool IsPacking { get; init; }
}

public sealed class CameraDownloadResult
{
    public bool Success { get; init; }
    public string? FilePath { get; init; }
    public bool IsTempFile { get; init; }
    public string? ErrorMessage { get; init; }
}
