using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Features.Hardware.Queries.ScanDevices;
using ArgusCam.Infrastructure.Configuration;
using ArgusCam.Infrastructure.HikVision.Native;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ArgusCam.Infrastructure.HikVision;

public class HardwareScanService : IHardwareScanService, IDisposable
{
    private readonly HikVisionSettings _settings;
    private readonly CameraSettings _cameraSettings;
    private readonly ILogger<HardwareScanService> _logger;
    private readonly SemaphoreSlim _scanLock = new(1, 1);
    private bool _sdkInitialized;

    public HardwareScanService(
        IOptions<HikVisionSettings> settings,
        IOptions<CameraSettings> cameraSettings,
        ILogger<HardwareScanService> logger)
    {
        _settings = settings.Value;
        _cameraSettings = cameraSettings.Value;
        _logger = logger;
    }

    public async Task<List<ScannedDeviceDto>> ScanDevicesAsync(
        string? username = null,
        string? password = null,
        CancellationToken cancellationToken = default)
    {
        if (!await _scanLock.WaitAsync(0, cancellationToken))
            throw new InvalidOperationException("A device scan is already in progress.");

        try
        {
            // Phase 1: SADP Discovery
            var discoveredDevices = await DiscoverDevicesAsync(cancellationToken);

            if (discoveredDevices.Count == 0)
                return [];

            // Phase 2: Login each device for channel info
            var effectiveUsername = string.IsNullOrWhiteSpace(username) ? _cameraSettings.Username : username;
            var effectivePassword = string.IsNullOrWhiteSpace(password) ? _cameraSettings.Password : password;

            var result = new List<ScannedDeviceDto>();
            InitHCNetSDK();

            foreach (var device in discoveredDevices)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var entries = GetDeviceEntries(device, effectiveUsername, effectivePassword);
                result.AddRange(entries);
            }

            return result.OrderBy(d => d.IPAddress).ThenBy(d => d.Channel).ToList();
        }
        finally
        {
            _scanLock.Release();
        }
    }

    private async Task<List<SADP_DEV_NET_PARAM>> DiscoverDevicesAsync(CancellationToken cancellationToken)
    {
        var processedSerials = new ConcurrentDictionary<string, bool>();
        var devices = new ConcurrentBag<SADP_DEV_NET_PARAM>();
        var lastDeviceTime = DateTime.UtcNow;
        var deviceCount = 0;
        var lockObj = new object();

        // Pin callback delegate to prevent GC collection during unmanaged call
        SadpImport.PUSER_NOTIFY_CALLBACK callback = (pDevNetParam, _) =>
        {
            try
            {
                if (pDevNetParam == IntPtr.Zero) return;

                var device = Marshal.PtrToStructure<SADP_DEV_NET_PARAM>(pDevNetParam);
                string serial = device.GetSerialNo();

                if (processedSerials.TryAdd(serial, true))
                {
                    devices.Add(device);
                    lock (lockObj)
                    {
                        deviceCount++;
                        lastDeviceTime = DateTime.UtcNow;
                    }
                    _logger.LogInformation("Discovered device [{Count}]: {Model} - {IP}",
                        deviceCount, device.GetModel(), device.GetIPv4());
                }
                else
                {
                    lock (lockObj) { lastDeviceTime = DateTime.UtcNow; }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error in SADP callback");
            }
        };

        // Keep a strong reference to prevent GC
        GC.KeepAlive(callback);

        try
        {
            StartSadpSearch(callback);

            var elapsedMs = 0;
            while (elapsedMs < _settings.ScanTimeoutMs)
            {
                cancellationToken.ThrowIfCancellationRequested();
                await Task.Delay(100, cancellationToken);
                elapsedMs += 100;

                lock (lockObj)
                {
                    if ((DateTime.UtcNow - lastDeviceTime).TotalMilliseconds >= _settings.QuietPeriodMs && deviceCount > 0)
                        break;
                }
            }

            _logger.LogInformation("SADP scan completed. Found {Count} devices", deviceCount);
        }
        finally
        {
            SadpImport.SADP_Stop();
        }

        return devices.ToList();
    }

    private void StartSadpSearch(SadpImport.PUSER_NOTIFY_CALLBACK callback)
    {
        int result;
        try
        {
            result = SadpImport.SADP_Start_V40(callback, 0, IntPtr.Zero);
            _logger.LogDebug("SADP V40 started");
        }
        catch
        {
            result = SadpImport.SADP_Start_V30(callback, 0, IntPtr.Zero);
            _logger.LogDebug("SADP V30 started (V40 not available)");
        }

        if (result == 0)
        {
            uint errorCode = SadpImport.SADP_GetLastError();
            throw new InvalidOperationException($"Failed to start SADP discovery. Error code: {errorCode}");
        }
    }

    private void InitHCNetSDK()
    {
        if (_sdkInitialized) return;

        var sdkPathConfigured = HCNetSDKImport.TrySetSdkComponentPath(AppContext.BaseDirectory, out var componentPath, out var componentPathError);
        if (!Directory.Exists(componentPath))
        {
            _logger.LogWarning("HikVision SDK component path does not exist: {Path}", componentPath);
        }
        else if (!sdkPathConfigured)
        {
            _logger.LogWarning("NET_DVR_SetSDKInitCfg failed for {Path}. Error: {Error}", componentPath, componentPathError);
        }
        else
        {
            _logger.LogInformation("HikVision SDK component path: {Path}", componentPath);
        }

        if (!HCNetSDKImport.NET_DVR_Init())
        {
            _logger.LogWarning("Failed to initialize HCNetSDK");
            return;
        }

        _sdkInitialized = true;
    }

    private List<ScannedDeviceDto> GetDeviceEntries(SADP_DEV_NET_PARAM device, string username, string password)
    {
        var entries = new List<ScannedDeviceDto>();
        string ip = device.GetIPv4();
        ushort port = device.wPort;
        string model = device.GetModel();
        string serialNo = device.GetSerialNo();
        string softwareVer = device.GetSoftwareVersion();
        string mac = device.GetMAC();

        if (!_sdkInitialized)
        {
            entries.Add(CreateEntry(model, serialNo, softwareVer, ip, mac, port, -1, "", isNvr: false, loginSuccess: false));
            return entries;
        }

        var deviceInfo = new NET_DVR_DEVICEINFO_V30();
        int userId = -1;

        try
        {
            userId = HCNetSDKImport.NET_DVR_Login_V30(
                ip,
                port,
                username,
                password,
                ref deviceInfo);

            if (userId < 0)
            {
                uint errorCode = HCNetSDKImport.NET_DVR_GetLastError();
                _logger.LogWarning("Failed to login {IP}:{Port}. Error: {Error}", ip, port, errorCode);
                entries.Add(CreateEntry(model, serialNo, softwareVer, ip, mac, port, 1, "", isNvr: false, loginSuccess: false));
                return entries;
            }

            string deviceType = GetDeviceTypeName(deviceInfo.byDVRType);
            int totalIP = deviceInfo.GetTotalIPChannels();
            int totalAnalog = deviceInfo.byChanNum;
            // NVR/DVR: có nhiều channel (IP channel hoặc >1 analog channel).
            // IPC (camera IP rời): thường chỉ có 1 analog channel và không có IP channel.
            bool isNvr = totalIP > 0 || totalAnalog > 1;

            _logger.LogInformation(
                "Login OK {IP}:{Port} - model={Model}, dvrType={Type}, totalIP={TotalIP}, totalAnalog={TotalAnalog}, isNvr={IsNvr}",
                ip, port, model, deviceType, totalIP, totalAnalog, isNvr);

            if (totalIP > 0)
            {
                int startChan = deviceInfo.GetDigitalStartChannel();
                for (int i = 0; i < totalIP; i++)
                {
                    entries.Add(CreateEntry(model, serialNo, softwareVer, ip, mac, port,
                        startChan + i, deviceType, isNvr: true, loginSuccess: true));
                }
            }
            else if (totalAnalog > 0)
            {
                int startChan = deviceInfo.byStartChan;
                for (int i = 0; i < totalAnalog; i++)
                {
                    entries.Add(CreateEntry(model, serialNo, softwareVer, ip, mac, port,
                        startChan + i, deviceType, isNvr: totalAnalog > 1, loginSuccess: true));
                }
            }
            else
            {
                entries.Add(CreateEntry(model, serialNo, softwareVer, ip, mac, port, 1, deviceType, isNvr: false, loginSuccess: true));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting channel info for {IP}", ip);
            entries.Add(CreateEntry(model, serialNo, softwareVer, ip, mac, port, 1, "", isNvr: false, loginSuccess: false));
        }
        finally
        {
            if (userId >= 0)
                HCNetSDKImport.NET_DVR_Logout(userId);
        }

        return entries;
    }

    private static ScannedDeviceDto CreateEntry(string model, string serialNo, string softwareVer,
        string ip, string mac, ushort port, int channel, string deviceType,
        bool isNvr, bool loginSuccess) => new()
    {
        Model = model,
        SerialNo = serialNo,
        SoftwareVersion = softwareVer,
        IPAddress = ip,
        MACAddress = mac,
        SDKPort = port,
        Channel = channel,
        DeviceType = deviceType,
        IsNvr = isNvr,
        LoginSuccess = loginSuccess
    };

    private static string GetDeviceTypeName(byte type) => type switch
    {
        0 => "DVR",
        1 => "ATMDVR",
        2 => "DVS",
        3 => "DEC",
        4 => "ENC_DEC",
        5 => "DVR_HC",
        6 => "DVR_HT",
        7 => "DVR_HF",
        8 => "DVR_HS",
        9 => "DVR_HTS",
        10 => "DVR_HB",
        11 => "DVR_HCS",
        12 => "DVS_A",
        13 => "DVR_HC_S",
        14 => "DVR_HT_S",
        15 => "DVR_HF_S",
        16 => "DVR_HS_S",
        17 => "ATMDVR_S",
        18 => "IPC",
        _ => $"Unknown({type})"
    };

    public void Dispose()
    {
        if (_sdkInitialized)
        {
            HCNetSDKImport.NET_DVR_Cleanup();
            _sdkInitialized = false;
        }
        _scanLock.Dispose();
        GC.SuppressFinalize(this);
    }
}
