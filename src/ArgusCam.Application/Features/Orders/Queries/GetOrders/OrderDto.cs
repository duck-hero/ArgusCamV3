namespace ArgusCam.Application.Features.Orders.Queries.GetOrders;

public class OrderDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = default!;
    public DateTime? Start { get; set; }
    public DateTime? End { get; set; }
    public int Status { get; set; }
    public int OrderStatus { get; set; }
    public string? Note { get; set; }
    public bool IsPacking { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public DateTimeOffset CreatedOn { get; set; }
}
