namespace ArgusCam.Application.Common.Models;

public class CursorPaginationRequest
{
    public string? Cursor { get; set; }
    public int Limit { get; set; } = 10;
}
