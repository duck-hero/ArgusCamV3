using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ArgusCam.Application.Common.Models;
using ArgusCam.Api.License;

namespace ArgusCam.Api.Controllers;

[Route("api/license")]
[AllowAnonymous]
[ApiController]
public class LicenseController : ControllerBase
{
    private readonly LicenseCheckService _licenseCheckService;

    public LicenseController(LicenseCheckService licenseCheckService)
    {
        _licenseCheckService = licenseCheckService;
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        return Ok(new ResponseData
        {
            Content = new
            {
                status = LicenseState.Status,
                isActive = LicenseState.IsActive,
                planCode = LicenseState.PlanCode,
                customerName = LicenseState.CustomerName,
                expiresAt = LicenseState.ExpiresAt,
                checkedAt = LicenseState.CheckedAt,
                message = LicenseState.Message,
            }
        });
    }

    [HttpPost("activate")]
    public async Task<IActionResult> Activate([FromBody] ActivateLicenseRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.LicenseKey))
            return BadRequest(new ResponseData { Err = "License key không được để trống" });

        await _licenseCheckService.CheckAsync(request.LicenseKey.Trim());

        return Ok(new ResponseData
        {
            Content = new
            {
                status = LicenseState.Status,
                isActive = LicenseState.IsActive,
                planCode = LicenseState.PlanCode,
                customerName = LicenseState.CustomerName,
                message = LicenseState.Message,
            }
        });
    }
}

public record ActivateLicenseRequest(string LicenseKey);
