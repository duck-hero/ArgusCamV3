using ArgusCam.Domain.Common;

namespace ArgusCam.Domain.Entities.VideoStore;

public class OrderCamera : BaseEntity<Guid>
{
    public Guid OrderId { get; set; }
    public virtual Order? Order { get; set; }

    public Guid CameraId { get; set; }
    public virtual Camera? Camera { get; set; }
}
