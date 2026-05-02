using System.Diagnostics;
using System.Net;
using Microsoft.Extensions.Logging;
using ArgusCam.Application.Common.Interfaces;

namespace ArgusCam.Infrastructure.Services;

public class Go2RtcService : IGo2RtcService, IDisposable
{
    private readonly ILogger<Go2RtcService> _logger;
    private readonly HttpClient _httpClient;
    private Process? _process;
    private readonly object _lock = new();
    
    // Key: streamKey (cameraId_type), Value: Last Heartbeat Time
    private readonly Dictionary<string, DateTime> _activeStreams = new();
    
    private const string ApiBaseUrl = "http://127.0.0.1:1984";
    private const int HeartbeatTimeoutSeconds = 30;

    public Go2RtcService(ILogger<Go2RtcService> logger)
    {
        _logger = logger;
        _httpClient = new HttpClient { BaseAddress = new Uri(ApiBaseUrl) };
    }

    public async Task<string> GetStreamUrlAsync(string streamKey, string rtspUrl)
    {
        lock (_lock)
        {
            EnsureProcessStarted();
            _activeStreams[streamKey] = DateTime.UtcNow;
        }

        var encodedRtsp = WebUtility.UrlEncode(rtspUrl);
        var url = $"/api/streams?src={encodedRtsp}&name={streamKey}";
        
        _logger.LogInformation("[Go2RTC] Adding stream. API: {Url}", ApiBaseUrl + url);

        try 
        {
            var response = await _httpClient.PutAsync(url, null);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("[Go2RTC] Error {StatusCode}: {Content}", response.StatusCode, content);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Go2RTC] Exception when calling API");
        }

        return $"ws://localhost:1984/api/ws?src={streamKey}";
    }

    public void SendHeartbeat(string streamKey)
    {
        lock (_lock)
        {
            if (_activeStreams.ContainsKey(streamKey))
            {
                _activeStreams[streamKey] = DateTime.UtcNow;
            }
        }
    }

    public async Task CleanupAsync()
    {
        var now = DateTime.UtcNow;
        var streamsToRemove = new List<string>();

        lock (_lock)
        {
            if (_process == null || _process.HasExited) return;

            foreach (var kvp in _activeStreams)
            {
                if ((now - kvp.Value).TotalSeconds > HeartbeatTimeoutSeconds)
                {
                    streamsToRemove.Add(kvp.Key);
                }
            }

            foreach (var key in streamsToRemove)
            {
                _activeStreams.Remove(key);
            }
        }

        foreach (var key in streamsToRemove)
        {
            try
            {
                await _httpClient.DeleteAsync($"/api/streams?src={key}");
                _logger.LogInformation("[Go2RTC] Removed inactive stream: {StreamKey}", key);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("[Go2RTC] Failed to remove stream: {Message}", ex.Message);
            }
        }

        lock (_lock)
        {
            if (_activeStreams.Count == 0 && _process != null && !_process.HasExited)
            {
                _logger.LogInformation("[Go2RTC] No active streams. Stopping process...");
                try 
                {
                    _process.Kill();
                    _process.WaitForExit(1000);
                } 
                finally
                {
                    _process.Dispose();
                    _process = null;
                }
            }
        }
    }

    private void EnsureProcessStarted()
    {
        if (_process != null && !_process.HasExited) return;

        var toolPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "tools", "go2rtc", "go2rtc.exe");

        if (!File.Exists(toolPath))
        {
            _logger.LogError("Go2RTC executable not found at {Path}", toolPath);
            throw new FileNotFoundException("Go2RTC executable not found.", toolPath);
        }

        // Kill mọi process go2rtc.exe mồ côi từ lần chạy API trước — chúng vẫn giữ port 1984/8554
        // khiến process mới không bind được và PUT /api/streams đi vào instance cũ.
        try
        {
            foreach (var stray in Process.GetProcessesByName("go2rtc"))
            {
                try
                {
                    _logger.LogWarning("[Go2RTC] Killing stray process PID {Pid}", stray.Id);
                    stray.Kill(true);
                    stray.WaitForExit(2000);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[Go2RTC] Failed to kill stray process PID {Pid}", stray.Id);
                }
                finally
                {
                    stray.Dispose();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Go2RTC] Error enumerating stray processes");
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = toolPath,
            WorkingDirectory = Path.GetDirectoryName(toolPath),
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        _process = new Process { StartInfo = startInfo };
        _process.OutputDataReceived += (_, e) =>
        {
            if (!string.IsNullOrWhiteSpace(e.Data))
                _logger.LogInformation("[Go2RTC] {Line}", e.Data);
        };
        _process.ErrorDataReceived += (_, e) =>
        {
            if (!string.IsNullOrWhiteSpace(e.Data))
                _logger.LogWarning("[Go2RTC] {Line}", e.Data);
        };
        _process.Start();
        _process.BeginOutputReadLine();
        _process.BeginErrorReadLine();
        _logger.LogInformation("[Go2RTC] Started with PID {Pid}", _process.Id);
        Thread.Sleep(500);
    }

    public void Dispose()
    {
        if (_process != null && !_process.HasExited) _process.Kill();
        _process?.Dispose();
        _httpClient.Dispose();
    }
}
