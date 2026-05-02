using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models.Config;

namespace ArgusCam.Api.Controllers.Admin;

/// <summary>
/// Controller quản lý cấu hình hệ thống.
/// </summary>
[ApiController]
[Route("api/admin/[controller]")]
[Authorize] // Admin only usually
public class ConfigController(
    IConfigService configService,
    IApplicationDbContext context,
    ISchedulerService schedulerService) : ApiController
{
    /// <summary>
    /// Lấy thông tin cấu hình ứng dụng (License, Plan).
    /// </summary>
    /// <returns>Thông tin Config App.</returns>
    [HttpGet("Config-app")]
    [AllowAnonymous]
    public async Task<IActionResult> GetConfigApp()
    {
        var configApp = await context.ConfigApps
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == 1);
        return Ok(configApp);
    }

    /// <summary>
    /// Cập nhật cấu hình ứng dụng.
    /// </summary>
    /// <param name="request">Thông tin cần cập nhật.</param>
    /// <returns>Trạng thái cập nhật.</returns>
    [HttpPut("Config-app")]
    [AllowAnonymous]
    public async Task<IActionResult> UpdateConfigApp([FromBody] ConfigAppDto request)
    {
        var configApp = await context.ConfigApps.FirstOrDefaultAsync(x => x.Id == 1);
        if (configApp == null)
        {
            throw new NotFoundException("Config app not found.");
        }

        configApp.LicenseKey = request.LicenseKey;
        // Update other fields if needed
        await context.SaveChangesAsync(CancellationToken.None);
        return Ok(new { message = "Config App updated successfully" });
    }

    /// <summary>
    /// Xác thực License thủ công.
    /// </summary>
    /// <returns>Kết quả xác thực.</returns>
    [HttpPost("verify-license")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyLicense()
    {
        await schedulerService.CheckValidLicense();
        return Ok("");
    }

    /// <summary>
    /// Lấy cấu hình App Settings chung.
    /// </summary>
    /// <returns>App Settings.</returns>
    [HttpGet("app-settings")]
    public async Task<IActionResult> GetAppSettings()
    {
        var settings = await configService.GetAppSettings();
        return Ok(settings);
    }

    /// <summary>
    /// Lấy cấu hình Camera (Admin, Password...).
    /// </summary>
    /// <returns>Camera Settings.</returns>
    [HttpGet("camera-settings")]
    public async Task<IActionResult> GetCameraSettings()
    {
        var settings = await configService.GetCameraSettings();
        return Ok(settings);
    }

    /// <summary>
    /// Lấy cấu hình Email gửi đi.
    /// </summary>
    /// <returns>Email Settings.</returns>
    [HttpGet("email-settings")]
    public async Task<IActionResult> GetEmailSettings()
    {
        var settings = await configService.GetEmailSettings();
        return Ok(settings);
    }

    /// <summary>
    /// Cập nhật App Settings.
    /// </summary>
    /// <param name="settings">Thông tin App Settings mới.</param>
    /// <returns>Trạng thái cập nhật.</returns>
    [HttpPut("app-settings")]
    public async Task<IActionResult> UpdateAppSettings([FromBody] AppSettingsDTO settings)
    {
        await configService.UpdateAppSettings(settings);
        return Ok(new { message = "App settings updated successfully" });
    }

    /// <summary>
    /// Cập nhật Email Settings.
    /// </summary>
    /// <param name="settings">Thông tin Email Settings mới.</param>
    /// <returns>Trạng thái cập nhật.</returns>
    [HttpPut("email-settings")]
    public async Task<IActionResult> UpdateEmailSettings([FromBody] EmailConfigurationDTO settings)
    {
        await configService.UpdateEmailSettings(settings);
        return Ok(new { message = "Email settings updated successfully" });
    }

    /// <summary>
    /// Cập nhật Camera Settings.
    /// </summary>
    /// <param name="settings">Thông tin Camera Settings mới.</param>
    /// <returns>Trạng thái cập nhật.</returns>
    [HttpPut("camera-settings")]
    public async Task<IActionResult> UpdateCameraSettings([FromBody] CameraSettingsDTO settings)
    {
        await configService.UpdateCameraSettings(settings);
        return Ok(new { message = "Camera settings updated successfully" });
    }
}
