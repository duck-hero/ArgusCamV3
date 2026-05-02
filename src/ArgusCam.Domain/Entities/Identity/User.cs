using Microsoft.AspNetCore.Identity;
using ArgusCam.Domain.Common.Interfaces;

namespace ArgusCam.Domain.Entities.Identity;

public class User : IdentityUser<Guid>, IAuditableEntity, ISoftDelete
{
    public string? FullName { get; set; }
    public string? QRImagePath { get; set; }
    public string? Description { get; set; }
    public string? UserType { get; set; } // Consider Enum later
    public bool Status { get; set; }

    // Foreign Keys (Assuming Guid for new architecture)
    public Guid? DocumentUploadId { get; set; }
    public Guid? DeskId { get; set; }
    public string? CurrentSessionId { get; set; }

    // 2FA & Chat
    public bool IsUse2FA { get; set; }
    public string? SecretKey { get; set; }
    public string? TeleToken { get; set; }
    public string? ChatId { get; set; }

    // Audit Interface
    public string? CreatedBy { get; set; }
    public DateTimeOffset CreatedOn { get; set; }
    public string? LastModifiedBy { get; set; }
    public DateTimeOffset LastModifiedOn { get; set; }

    // Soft Delete Interface
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedOn { get; set; }
    public string? DeletedBy { get; set; }

    // Navigation properties can be added here if needed, 
    // but Clean Architecture often prefers decoupling aggregates.
}
