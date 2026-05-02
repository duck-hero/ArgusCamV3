using ArgusCam.Domain.Entities.VideoStore;

namespace ArgusCam.Application.Common.Interfaces;

public interface ICameraProviderFactory
{
    ICameraProvider Resolve(Camera camera);
}
