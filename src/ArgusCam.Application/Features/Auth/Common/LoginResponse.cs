namespace ArgusCam.Application.Features.Auth.Common;

public record LoginResponse(
    bool isUse2Fa,
    string Token,
    string? ReturnUrl,
    string? RefreshToken,
    Guid UserId,
    string FullName,
    List<string> Roles
);