namespace ArgusCam.Api.License;

public static class LicenseState
{
    public static string Status { get; set; } = "unknown";
    public static string? PlanCode { get; set; }
    public static string? CustomerName { get; set; }
    public static DateTimeOffset? ExpiresAt { get; set; }
    public static DateTimeOffset? CheckedAt { get; set; }
    public static string? Message { get; set; }

    public static bool IsActive => Status == "active";
}
