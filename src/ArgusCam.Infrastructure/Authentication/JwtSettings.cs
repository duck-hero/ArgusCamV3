namespace ArgusCam.Infrastructure.Authentication;

public static class JwtSettings
{
    public const string Secret = "super-secret-key-that-is-at-least-32-chars-long";
    public const string Issuer = "ArgusCamApi";
    public const string Audience = "ArgusCamClient";
    public const int ExpiryMinutes = 120;
}
