namespace ArgusCam.Application.Features.Auth.Queries.GetQR;

public class GetQRV2Response
{
    public string HeaderText { get; set; } = default!;
    public List<QrCodeItem> QrCodes { get; set; } = [];
}

public class QrCodeItem
{
    public string Label { get; set; } = default!;
    public string JsonContent { get; set; } = default!;
    public string Color { get; set; } = "Black"; // Suggestion for FE
}
