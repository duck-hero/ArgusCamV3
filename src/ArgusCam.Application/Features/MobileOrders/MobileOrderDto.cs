namespace ArgusCam.Application.Features.MobileOrders;

public record MobileOrderDto(
    Guid Id,
    string Code,
    DateTime? Start,
    DateTime? End,
    bool IsPacking,
    Guid? DeskId,
    string? DeskName);

public record MobileScanOrderResponse(
    MobileOrderDto ActiveOrder,
    MobileOrderDto? ClosedOrder,
    bool IsDuplicateScan);
