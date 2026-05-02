namespace ArgusCam.Application.Common.Models;

public class ResponseData
{
    public object? Content { get; set; }
    public string? Err { get; set; } // Legacy field
}

public class ResponseErrorData
{
    public string? ErrorType { get; set; }
    public string? ErrorMessage { get; set; }
}
