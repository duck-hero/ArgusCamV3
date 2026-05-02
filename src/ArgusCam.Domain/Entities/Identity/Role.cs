using Microsoft.AspNetCore.Identity;
using ArgusCam.Domain.Common.Interfaces;

namespace ArgusCam.Domain.Entities.Identity;

public class Role : IdentityRole<Guid>, IAuditableEntity
{
    public string? Code { get; set; }
    public string? Description { get; set; }

    // Audit Interface
    public string? CreatedBy { get; set; }
    public DateTimeOffset CreatedOn { get; set; }
    public string? LastModifiedBy { get; set; }
    public DateTimeOffset LastModifiedOn { get; set; }
}
