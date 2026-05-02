using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;
using ArgusCam.Application.Features.Auth.Commands.ChangePassword;
using ArgusCam.Application.Features.Auth.Commands.ForgotPassword;
using ArgusCam.Application.Features.Auth.Commands.Login;
using ArgusCam.Application.Features.Auth.Commands.RefreshToken;
using ArgusCam.Application.Features.Auth.Commands.Register;
using ArgusCam.Application.Features.Auth.Commands.ResetPassword;
using ArgusCam.Application.Features.Auth.Queries.GetQR;

namespace ArgusCam.Api.Controllers;

/// <summary>
/// Controller quản lý tài khoản người dùng, đăng nhập, đăng ký và xác thực.
/// </summary>
[Route("api/[controller]/[action]")]
public class AccountController(ICurrentUserService currentUserService) : ApiController
{
    /// <summary>
    /// Làm mới Access Token bằng Refresh Token.
    /// </summary>
    /// <param name="command">Access Token (hết hạn) và Refresh Token.</param>
    /// <returns>Cặp Token mới.</returns>
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<ResponseData>> RefreshToken(RefreshTokenCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(new ResponseData { Content = result });
    }

    /// <summary>
    /// Đổi mật khẩu cho người dùng hiện tại.
    /// </summary>
    /// <param name="command">Mật khẩu cũ và mới.</param>
    /// <returns>Trạng thái đổi mật khẩu.</returns>
    [HttpPost]
    [Authorize]
    [ActionName("ChangePassword")]
    public async Task<ActionResult<ResponseData>> ChangePassword([FromForm] ChangePasswordCommand command)
    {
        await Mediator.Send(command);
        return Ok(new ResponseData { Content = new { Status = true } });
    }

    /// <summary>
    /// Yêu cầu khôi phục mật khẩu (Gửi email mật khẩu mới/token).
    /// </summary>
    /// <param name="command">Email người dùng.</param>
    /// <returns>Trạng thái yêu cầu.</returns>
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<ResponseData>> ForgotPassword(ForgotPasswordCommand command)
    {
        await Mediator.Send(command);
        return Ok(new ResponseData 
        { 
            Content = new 
            {   
                Status = true,
                Message = "Mật khẩu mới đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư."
            } 
        });
    }

    /// <summary>
    /// Đặt lại mật khẩu (Sử dụng Token reset).
    /// </summary>
    /// <param name="command">Thông tin reset.</param>
    /// <returns>Trạng thái reset.</returns>
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<ResponseData>> ResetPassword(ResetPasswordCommand command)
    {
        await Mediator.Send(command);
        return Ok(new ResponseData { Content = new { Status = true } });
    }

    /// <summary>
    /// Đăng ký tài khoản người dùng mới.
    /// </summary>
    /// <param name="command">Thông tin đăng ký (Họ tên, Email, Mật khẩu).</param>
    /// <returns>Kết quả đăng ký.</returns>
    [HttpPost]
    public async Task<ActionResult<ResponseData>> Register(RegisterCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(new ResponseData 
        { 
            Content = new 
            { 
                Status = true, 
                Message = "Registered successfully" 
            } 
        });
    }

    /// <summary>
    /// Đăng nhập vào hệ thống.
    /// </summary>
    /// <param name="model">Thông tin đăng nhập (Email, Mật khẩu).</param>
    /// <returns>Token JWT và thông tin người dùng.</returns>
    [HttpPost]
    public async Task<ActionResult<ResponseData>> Login(LoginCommand model)
    {
        var result = await Mediator.Send(model);
        return Ok(new ResponseData
        {
            Content = result
        });
    }

    /// <summary>
    /// Lấy thông tin người dùng hiện tại (Profile).
    /// </summary>
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<ResponseData>> GetProfile()
    {
        var result = await Mediator.Send(new ArgusCam.Application.Features.Users.Queries.GetCurrentUser.GetCurrentUserQuery());
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin cá nhân (Profile).
    /// </summary>
    [HttpPut]
    [Authorize]
    public async Task<ActionResult<ResponseData>> UpdateProfile([FromBody] ArgusCam.Application.Features.Users.Commands.UpdateProfile.UpdateProfileCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Lấy dữ liệu để tạo mã QR bắt đầu phiên làm việc (Phiên bản 1).
    /// </summary>
    /// <returns>Dữ liệu JSON cho mã QR.</returns>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ResponseData>> GetQR()
    {
        var userId = currentUserService.UserId;
        if (userId == null) throw new UnauthorizedException("User is not authenticated.");

        var qrData = await Mediator.Send(new GetQRQuery(userId.Value));
        return Ok(new ResponseData
        {
            Content = qrData
        });
    }

    /// <summary>
    /// Lấy dữ liệu để tạo mã QR phiên bản 2 (Gộp 3 mã QR: Bắt đầu, Bóc hoàn, Kết thúc).
    /// Trả về JSON để Frontend tự generate ảnh.
    /// </summary>
    /// <returns>Dữ liệu JSON cho 3 mã QR.</returns>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ResponseData>> GetQRV2()
    {
        var userId = currentUserService.UserId;
        if (userId == null) throw new UnauthorizedException("User is not authenticated.");

        var qrData = await Mediator.Send(new GetQRV2Query(userId.Value));
        return Ok(new ResponseData
        {
            Content = qrData
        });
    }
}
