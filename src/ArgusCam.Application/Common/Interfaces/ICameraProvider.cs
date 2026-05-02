using ArgusCam.Application.Common.Models.CameraProviders;
using ArgusCam.Domain.Entities.VideoStore;

namespace ArgusCam.Application.Common.Interfaces;

public interface ICameraProvider
{
    string ProviderKey { get; }
    int Priority { get; }

    bool CanHandle(Camera camera);

    Task<CameraDownloadResult> DownloadVideoAsync(CameraDownloadRequest request, CancellationToken cancellationToken = default);

    string BuildRtspUrl(Camera camera, int streamType);
}
