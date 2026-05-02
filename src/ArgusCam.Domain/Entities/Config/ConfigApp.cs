using ArgusCam.Domain.Common;

namespace ArgusCam.Domain.Entities.Config;

public class ConfigApp : BaseEntity<long>
{
    public string? Host { get; set; }
    public string? LicenseKey { get; set; }
    public string? GoiSuDung { get; set; }
    public string? TenKhachHang { get; set; }
    public int? SoCamera { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? Status { get; set; }
    public string? AvailablePlans { get; set; }
}
