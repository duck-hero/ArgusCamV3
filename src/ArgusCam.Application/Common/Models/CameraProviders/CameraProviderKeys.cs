namespace ArgusCam.Application.Common.Models.CameraProviders;

public static class CameraProviderKeys
{
    public const string Hikvision = "hikvision";
    public const string Imou = "imou";
    public const string Ezviz = "ezviz";

    public static string Normalize(string? providerKey)
    {
        if (string.IsNullOrWhiteSpace(providerKey))
        {
            return Hikvision;
        }

        return providerKey.Trim().ToLowerInvariant() switch
        {
            "hik" => Hikvision,
            Hikvision => Hikvision,
            Imou => Imou,
            Ezviz => Ezviz,
            var value => value,
        };
    }
}
