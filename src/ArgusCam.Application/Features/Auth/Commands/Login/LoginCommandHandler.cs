using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Features.Auth.Common;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Application.Features.Auth.Commands.Login;

/// <summary>
/// Xử lý đăng nhập bằng Username hoặc Email (thông qua trường UserName).
/// </summary>
public class LoginCommandHandler(
    UserManager<User> userManager,
    IJwtTokenGenerator jwtTokenGenerator,
    IApplicationDbContext context)
    : IRequestHandler<LoginCommand, LoginResponse>
{
    public async Task<LoginResponse> Handle(LoginCommand command, CancellationToken cancellationToken)
    {
        // 1. Tìm user theo Email trước
        var user = await userManager.FindByEmailAsync(command.UserName);

        // 2. Nếu không thấy, tìm theo Username
        if (user is null)
        {
            user = await userManager.FindByNameAsync(command.UserName);
        }

        // 3. Kiểm tra thông tin
        if (user is null || user.IsDeleted)
        {
            throw new BadRequestException("Tài khoản hoặc mật khẩu không chính xác.");
        }

        var isPasswordValid = await userManager.CheckPasswordAsync(user, command.Password);
        
        if (!isPasswordValid)
        {
             throw new BadRequestException("Tài khoản hoặc mật khẩu không chính xác.");
        }

        // 4. Tạo Token
        var sessionId = Guid.NewGuid().ToString("N");
        user.CurrentSessionId = sessionId;
        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            throw new BadRequestException("Khong the cap nhat phien dang nhap.");
        }

        var activeRefreshTokens = await context.RefreshTokens
            .Where(x => x.UserId == user.Id && !x.Used && !x.Invalidated && x.ExpiryDate > DateTime.UtcNow)
            .ToListAsync(cancellationToken);

        foreach (var activeRefreshToken in activeRefreshTokens)
        {
            activeRefreshToken.Invalidated = true;
        }

        var roles = await userManager.GetRolesAsync(user);
        var token = jwtTokenGenerator.GenerateToken(user, [.. roles], sessionId);
        var refreshToken = jwtTokenGenerator.GenerateRefreshToken();

        // 5. Lưu Refresh Token
        var refreshTokenEntity = new ArgusCam.Domain.Entities.Identity.RefreshToken
        {
            JwtId = sessionId,
            Token = refreshToken,
            CreationDate = DateTime.UtcNow,
            ExpiryDate = DateTime.UtcNow.AddMonths(1),
            UserId = user.Id
        };
        context.RefreshTokens.Add(refreshTokenEntity);
        await context.SaveChangesAsync(cancellationToken);

        return new LoginResponse(
            user.IsUse2FA,
            token,
            null,
            refreshToken,
            user.Id,
            user.FullName ?? "",
            [.. roles]
        );
    }
}
