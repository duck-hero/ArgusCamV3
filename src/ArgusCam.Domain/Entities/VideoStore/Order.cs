using ArgusCam.Domain.Common;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Domain.Entities.VideoStore;

public class Order : BaseAuditableEntity<Guid>
{
    public string Code { get; set; } = default!;
    public DateTime? Start { get; set; }
    public DateTime? End { get; set; }
    public int Status { get; set; } // TODO: Define Enum
    public int OrderStatus { get; set; } // TODO: Define Enum
    public string? Note { get; set; }
    public bool IsPacking { get; set; } = true;
    public double TotalWeight { get; set; }

    public Guid? UserId { get; set; }
    public virtual User? User { get; set; }

    public Guid? DeskId { get; set; }
    public virtual Desk? Desk { get; set; }

    public virtual ICollection<OrderCamera> OrderCameras { get; set; } = [];
    public virtual ICollection<Video> Videos { get; set; } = [];
}
