namespace ArgusCam.Application.Features.Users.Queries.GetCurrentUser;

public class UserProfileDto
{
    public Guid Id { get; set; }
    public string? UserName { get; set; }
    public string? Email { get; set; }
    public string? FullName { get; set; }
    public string? PhoneNumber { get; set; }
    public bool Status { get; set; }
    public string? UserType { get; set; }
    public DateTimeOffset CreatedOn { get; set; }
    public List<string> Roles { get; set; } = [];
}
