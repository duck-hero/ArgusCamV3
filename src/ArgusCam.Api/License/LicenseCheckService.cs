using System.Text.Json;

namespace ArgusCam.Api.License;

public class LicenseCheckService
{
    private const string DefaultApiBaseUrl = "https://admin.arguscam.io.vn";
    private readonly string _appsettingsPath;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LicenseCheckService> _logger;

    public LicenseCheckService(IConfiguration configuration, ILogger<LicenseCheckService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        _appsettingsPath = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");
    }

    public async Task CheckAsync(string? overrideLicenseKey = null)
    {
        var licenseKey = overrideLicenseKey ?? _configuration["License:Key"] ?? string.Empty;

        if (string.IsNullOrWhiteSpace(licenseKey))
        {
            _logger.LogWarning("No license key is configured.");
            SetInactiveState(
                "pending",
                "Chua co license key. Vui long lien he nha cung cap de dang ky.");
            return;
        }

        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
            var payload = new { license_key = licenseKey };
            var response = await client.PostAsJsonAsync(GetLicenseCheckUrl(), payload);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("License API returned {StatusCode}", response.StatusCode);
                SetInactiveState("unknown", "Khong the xac minh license");
                return;
            }

            var json = await response.Content.ReadFromJsonAsync<JsonDocument>();
            if (json is null)
            {
                SetInactiveState("unknown", "Phan hoi trong tu license server");
                return;
            }

            var root = json.RootElement;
            if (!root.TryGetProperty("success", out var successEl) || !successEl.GetBoolean())
            {
                SetInactiveState("unknown", "Phan hoi khong hop le tu license server");
                return;
            }

            var result = root.GetProperty("result");
            var status = GetStringOrDefault(result, "status", "unknown") ?? "unknown";
            var message = GetStringOrDefault(result, "message", status == "active" ? "License hop le" : $"License {status}");

            if (!result.TryGetProperty("license", out var license) || license.ValueKind == JsonValueKind.Null)
            {
                SetInactiveState(status, message);
                _logger.LogWarning("License check failed: status={Status} message={Message}", status, message);
                return;
            }

            result.TryGetProperty("customer", out var customer);

            LicenseState.Status = GetStringOrDefault(license, "effective_status", "unknown") ?? "unknown";
            LicenseState.PlanCode = GetStringOrDefault(license, "plan_code", null);
            LicenseState.CustomerName = customer.ValueKind == JsonValueKind.Object
                ? GetStringOrDefault(customer, "name", null)
                : null;
            LicenseState.CheckedAt = DateTimeOffset.UtcNow;
            LicenseState.ExpiresAt = null;
            LicenseState.Message = message;

            if (license.TryGetProperty("expires_at", out var expiresEl) && expiresEl.ValueKind != JsonValueKind.Null)
                LicenseState.ExpiresAt = expiresEl.GetDateTimeOffset();

            _logger.LogInformation("License: status={Status} | plan={Plan} | customer={Customer}",
                LicenseState.Status, LicenseState.PlanCode, LicenseState.CustomerName);

            if (overrideLicenseKey is not null && LicenseState.IsActive)
                await SaveKeyToAppsettings(overrideLicenseKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while calling license API");
            SetInactiveState("unknown", "Khong the ket noi den license server");
        }
    }

    private string GetLicenseCheckUrl()
    {
        var baseUrl = _configuration["License:ApiBaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl))
            baseUrl = DefaultApiBaseUrl;

        return $"{baseUrl.TrimEnd('/')}/licenses/check";
    }

    private static string? GetStringOrDefault(JsonElement element, string propertyName, string? fallback)
    {
        if (element.ValueKind != JsonValueKind.Object ||
            !element.TryGetProperty(propertyName, out var value) ||
            value.ValueKind == JsonValueKind.Null)
        {
            return fallback;
        }

        return value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
    }

    private static void SetInactiveState(string status, string? message)
    {
        LicenseState.Status = status;
        LicenseState.PlanCode = null;
        LicenseState.CustomerName = null;
        LicenseState.ExpiresAt = null;
        LicenseState.CheckedAt = DateTimeOffset.UtcNow;
        LicenseState.Message = message;
    }

    private async Task SaveKeyToAppsettings(string licenseKey)
    {
        try
        {
            var json = await File.ReadAllTextAsync(_appsettingsPath);
            var options = new JsonSerializerOptions { WriteIndented = true };
            var allConfig = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
            if (allConfig is null) return;

            var licenseSection = new Dictionary<string, object?>
            {
                ["Key"] = licenseKey,
                ["ApiBaseUrl"] = _configuration["License:ApiBaseUrl"] ?? DefaultApiBaseUrl,
            };
            allConfig["License"] = JsonSerializer.SerializeToElement(licenseSection, options);

            await File.WriteAllTextAsync(_appsettingsPath, JsonSerializer.Serialize(allConfig, options));
            (_configuration as IConfigurationRoot)?.Reload();

            _logger.LogInformation("Saved the new license key to appsettings.json");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not save the license key to appsettings.json");
        }
    }
}
