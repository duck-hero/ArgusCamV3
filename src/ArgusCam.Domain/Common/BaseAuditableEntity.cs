using ArgusCam.Domain.Common.Interfaces;

namespace ArgusCam.Domain.Common;

public abstract class BaseAuditableEntity<TKey> : BaseEntity<TKey>, IAuditableEntity, ISoftDelete
{
    public string? CreatedBy { get; set; }
    public DateTimeOffset CreatedOn { get; set; }
    public string? LastModifiedBy { get; set; }
    public DateTimeOffset LastModifiedOn { get; set; }
    
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedOn { get; set; }
    public string? DeletedBy { get; set; }
}
