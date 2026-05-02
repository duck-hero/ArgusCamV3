namespace ArgusCam.Api.License;

public class LicenseMiddleware
{
    private readonly RequestDelegate _next;

    public LicenseMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        // Chỉ chặn các API request, không chặn static files và license endpoint
        var isApiRequest = path.StartsWith("/api", StringComparison.OrdinalIgnoreCase);
        var isLicenseEndpoint = path.StartsWith("/api/license", StringComparison.OrdinalIgnoreCase);

        if (isApiRequest && !isLicenseEndpoint && !LicenseState.IsActive)
        {
            context.Response.StatusCode = 402;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                content = (object?)null,
                err = $"license_{LicenseState.Status}"
            });
            return;
        }

        await _next(context);
    }
}
