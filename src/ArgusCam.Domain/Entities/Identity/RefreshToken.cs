using ArgusCam.Domain.Common;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Domain.Entities.Identity;

public class RefreshToken : BaseEntity<Guid>
{
    public string Token { get; set; } = default!;
    public string JwtId { get; set; } = default!;
    public DateTime CreationDate { get; set; }
    public DateTime ExpiryDate { get; set; }
    public bool Used { get; set; }
    public bool Invalidated { get; set; }
    
    public Guid? UserId { get; set; }
    public virtual User? User { get; set; } = default!;
}
