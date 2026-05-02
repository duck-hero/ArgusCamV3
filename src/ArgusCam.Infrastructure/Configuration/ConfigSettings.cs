namespace ArgusCam.Infrastructure.Configuration;

public class AppSettings
{
    public const string SectionName = "AppSettings";
    public string? AccessTokenExpireTimeSpan { get; set; }
    public int TokenExpirationInMinute { get; set; }
    public string? UploadPath { get; set; }
    public bool AutoDownload { get; set; }
    public string? BaseUrl { get; set; }
    public int RefreshExpireDay { get; set; }
}

public class EmailConfiguration
{
    public const string SectionName = "EmailConfiguration";
    public string? EmailHost { get; set; }
    public int EmailPort { get; set; }
    public string? EmailUser { get; set; }
    public string? EmailPass { get; set; }
    public string? EmailFrom { get; set; }
    public string? EmailAdmin { get; set; }
}
