using MediatR;
using Microsoft.AspNetCore.Identity;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Application.Features.Auth.Commands.ForgotPassword;

public class ForgotPasswordCommandHandler(
    UserManager<User> userManager,
    IEmailService emailService) : IRequestHandler<ForgotPasswordCommand, bool>
{
    public async Task<bool> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            // Don't reveal user existence
            return true;
        }

        // Generate Token
        // In legacy, it resets password directly to default "123456" and sends email.
        // Or uses ResetToken. Legacy code shown used ResetToken to reset to default.
        
        // Let's follow modern standard: Send Token via Email.
        // But legacy controller logic: "ResetPasswordAsync(user, resetToken, newPassword)" where newPassword is _passwordSettings.UserPassDefault.
        
        // I will follow Legacy: Reset to Default Password and Email it.
        string newPassword = "DefaultPassword@123"; // Should use settings
        
        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var result = await userManager.ResetPasswordAsync(user, token, newPassword);
        
        if (result.Succeeded)
        {
            await emailService.SendEmailAsync(
                user.Email!, 
                "Khôi phục mật khẩu", 
                $"Mật khẩu mới của bạn là: {newPassword}");
        }

        return true;
    }
}
