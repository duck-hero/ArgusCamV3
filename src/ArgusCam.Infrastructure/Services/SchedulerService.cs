using Microsoft.Extensions.Logging;
using ArgusCam.Application.Common.Interfaces;

namespace ArgusCam.Infrastructure.Services;

public class SchedulerService(ILogger<SchedulerService> logger) : ISchedulerService
{
    public Task CheckValidLicense()
    {
        logger.LogInformation("Checking license...");
        // Implement license check logic here
        return Task.CompletedTask;
    }
}
