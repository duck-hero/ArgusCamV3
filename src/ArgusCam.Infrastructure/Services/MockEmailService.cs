using Microsoft.Extensions.Logging;
using ArgusCam.Application.Common.Interfaces;

namespace ArgusCam.Infrastructure.Services;

public class MockEmailService(ILogger<MockEmailService> logger) : IEmailService
{
    public Task SendEmailAsync(string to, string subject, string body)
    {
        logger.LogInformation("Sending email to {To} with subject {Subject}. Body: {Body}", to, subject, body);
        return Task.CompletedTask;
    }
}
