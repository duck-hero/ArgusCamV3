using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Api.Controllers;

/// <summary>
/// Quản lý liên kết & đồng bộ Google Drive (OAuth + upload video).
/// </summary>
[Route("api/google-drive")]
public class GoogleDriveController(IGoogleDriveService driveService) : ApiController
{
    /// <summary>
    /// Trả về tài khoản Google Drive đang liên kết (nếu có).
    /// </summary>
    [HttpGet("status")]
    public async Task<ActionResult<ResponseData>> GetStatus(CancellationToken cancellationToken)
    {
        var account = await driveService.GetLinkedAccountAsync(cancellationToken);
        return Ok(new ResponseData { Content = account });
    }

    /// <summary>
    /// Sinh URL authorize Google OAuth để frontend mở popup/tab mới.
    /// </summary>
    [HttpPost("authorize")]
    public ActionResult<ResponseData> Authorize()
    {
        // state để callback biết request hợp lệ; tạm dùng guid random, frontend không cần verify cho đơn giản
        var state = Guid.NewGuid().ToString("N");
        var url = driveService.BuildAuthorizationUrl(state);
        return Ok(new ResponseData { Content = new { url, state } });
    }

    /// <summary>
    /// Google redirect về đây sau khi user đồng ý. Đổi code lấy refresh_token và lưu.
    /// Trả về HTML đóng cửa sổ + postMessage để cửa sổ chính refresh.
    /// </summary>
    [HttpGet("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code,
        [FromQuery] string? error,
        [FromQuery] string? state,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(error))
        {
            return Content(BuildCallbackHtml(success: false, message: $"Google từ chối liên kết: {error}"), "text/html", Encoding.UTF8);
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            return Content(BuildCallbackHtml(success: false, message: "Thiếu authorization code."), "text/html", Encoding.UTF8);
        }

        try
        {
            var info = await driveService.ExchangeCodeAsync(code, cancellationToken);
            return Content(BuildCallbackHtml(success: true, message: $"Đã liên kết: {info.Email}"), "text/html", Encoding.UTF8);
        }
        catch (Exception ex)
        {
            return Content(BuildCallbackHtml(success: false, message: ex.Message), "text/html", Encoding.UTF8);
        }
    }

    /// <summary>
    /// Hủy liên kết tài khoản Google Drive.
    /// </summary>
    [HttpPost("disconnect")]
    public async Task<ActionResult<ResponseData>> Disconnect(CancellationToken cancellationToken)
    {
        await driveService.DisconnectAsync(cancellationToken);
        return Ok(new ResponseData { Content = new { message = "Đã hủy liên kết Google Drive." } });
    }

    /// <summary>
    /// Upload video lên Drive và lưu lại link.
    /// </summary>
    [HttpPost("sync-video/{videoId:guid}")]
    public async Task<ActionResult<ResponseData>> SyncVideo([FromRoute] Guid videoId, CancellationToken cancellationToken)
    {
        var result = await driveService.UploadVideoAsync(videoId, cancellationToken);
        return Ok(new ResponseData { Content = result });
    }

    private static string BuildCallbackHtml(bool success, string message)
    {
        var safeMessage = System.Net.WebUtility.HtmlEncode(message);
        var status = success ? "success" : "error";
        var color = success ? "#16a34a" : "#dc2626";
        var title = success ? "Liên kết Google Drive thành công" : "Liên kết Google Drive thất bại";

        return $$"""
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="utf-8" />
              <title>{{title}}</title>
              <style>
                body { font-family: Segoe UI, Arial, sans-serif; background:#f8fafc; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
                .card { background:#fff; padding:32px 40px; border-radius:12px; box-shadow:0 8px 24px rgba(15,23,42,0.08); max-width:420px; text-align:center; }
                h1 { color: {{color}}; font-size:20px; margin:0 0 12px; }
                p { color:#334155; margin:0 0 20px; }
                button { background:#0ea5e9; color:#fff; border:0; padding:10px 20px; border-radius:8px; cursor:pointer; font-size:14px; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>{{title}}</h1>
                <p>{{safeMessage}}</p>
                <button onclick="window.close()">Đóng cửa sổ</button>
              </div>
              <script>
                try {
                  if (window.opener) {
                    window.opener.postMessage({ type: 'google-drive-auth', status: '{{status}}' }, '*');
                  }
                } catch (e) { /* ignore */ }
                setTimeout(() => { try { window.close(); } catch (e) {} }, 1500);
              </script>
            </body>
            </html>
            """;
    }
}
