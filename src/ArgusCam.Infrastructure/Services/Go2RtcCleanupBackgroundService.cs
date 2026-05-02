using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ArgusCam.Infrastructure.Services;

public class Go2RtcCleanupBackgroundService : BackgroundService
{
    private readonly Go2RtcService _service;
    private readonly ILogger<Go2RtcCleanupBackgroundService> _logger;

    public Go2RtcCleanupBackgroundService(Go2RtcService service, ILogger<Go2RtcCleanupBackgroundService> logger)
    {
        _service = service;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Run cleanup every 15 seconds
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            
            try
            {
                await _service.CleanupAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during Go2RTC cleanup");
            }
        }
    }
}
