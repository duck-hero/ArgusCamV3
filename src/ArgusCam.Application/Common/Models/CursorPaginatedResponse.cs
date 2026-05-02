namespace ArgusCam.Application.Common.Models;

public class CursorPaginatedResponse<T>
{
    public List<T> Items { get; set; } = [];
    public string? NextCursor { get; set; }
    public bool HasNextPage { get; set; }
}
