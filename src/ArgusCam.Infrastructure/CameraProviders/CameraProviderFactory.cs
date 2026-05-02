using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Domain.Entities.VideoStore;

namespace ArgusCam.Infrastructure.CameraProviders;

public class CameraProviderFactory(IEnumerable<ICameraProvider> providers) : ICameraProviderFactory
{
    private readonly ICameraProvider[] _providers = providers
        .OrderByDescending(p => p.Priority)
        .ToArray();

    public ICameraProvider Resolve(Camera camera)
    {
        var provider = _providers.FirstOrDefault(p => p.CanHandle(camera));
        if (provider == null)
        {
            throw new InvalidOperationException($"No camera provider matched camera {camera.Code}.");
        }

        return provider;
    }
}
