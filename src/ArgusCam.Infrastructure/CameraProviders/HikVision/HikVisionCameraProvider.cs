using System.Diagnostics;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models.CameraProviders;
using ArgusCam.Domain.Entities.VideoStore;
using ArgusCam.Infrastructure.Configuration;
using ArgusCam.Infrastructure.HikVision.Native;

namespace ArgusCam.Infrastructure.CameraProviders.HikVision;

public class HikVisionCameraProvider(
    IOptions<FileSettings> fileSettings,
    IOptions<CameraSettings> cameraSettings,
    IOptions<HikVisionSettings> hikVisionSettings,
    IVideoProgressNotifier progressNotifier,
    ILogger<HikVisionCameraProvider> logger) : ICameraProvider
{
    private readonly FileSettings _fileSettings = fileSettings.Value;
    private readonly CameraSettings _cameraSettings = cameraSettings.Value;
    private readonly HikVisionSettings _hikVisionSettings = hikVisionSettings.Value;

    private static bool _sdkInitialized;
    private static readonly object _sdkInitLock = new();
    private static readonly SemaphoreSlim _downloadSemaphore = new(1, 1);

    private int _currentDownHandle = -1;
    private readonly object _handleLock = new();

    public string ProviderKey => "hikvision";
    public int Priority => 0;

    public bool CanHandle(Camera camera)
    {
        string providerKey = CameraProviderKeys.Normalize(camera.ProviderKey);
        if (!string.IsNullOrWhiteSpace(providerKey))
        {
            return providerKey == CameraProviderKeys.Hikvision;
        }

        string explicitProvider = GetExplicitProvider(camera);
        if (!string.IsNullOrWhiteSpace(explicitProvider))
        {
            return explicitProvider is "hikvision" or "hik";
        }

        return true;
    }

    public string BuildRtspUrl(Camera camera, int streamType)
    {
        if (string.IsNullOrWhiteSpace(camera.CameraIP))
        {
            throw new InvalidOperationException($"Camera {camera.Code} does not have IP configured.");
        }

        int type = streamType is 1 or 2 ? streamType : 2;
        string channelIndex = !string.IsNullOrWhiteSpace(camera.CameraChannel) ? camera.CameraChannel : "1";

        // SDK trả về digital channel bắt đầu từ 33 cho NVR (33=slot 1, 34=slot 2...). DB lưu theo SDK
        // để NET_DVR_GetFileByTime_V40 download đúng. Nhưng RTSP của Hikvision dùng display channel
        // 1-based (khớp web UI), nên convert >32 về slot tương ứng.
        int rtspChannel = int.TryParse(channelIndex, out var sdkChan) && sdkChan > 32
            ? sdkChan - 32
            : sdkChan <= 0 ? 1 : sdkChan;
        string streamCode = $"{rtspChannel}0{type}";

        // Username/password phải được percent-encode trong userinfo — nếu password chứa '@', ':', '/', '?', '#'
        // thì RTSP parser (go2rtc / ffmpeg) sẽ cắt sai ranh giới userinfo ↔ host và login thất bại.
        string encodedUser = Uri.EscapeDataString(_cameraSettings.Username ?? string.Empty);
        string encodedPass = Uri.EscapeDataString(_cameraSettings.Password ?? string.Empty);

        string url = $"rtsp://{encodedUser}:{encodedPass}@{camera.CameraIP}:{_cameraSettings.RtspPort}/Streaming/Channels/{streamCode}";
        logger.LogInformation("Built RTSP URL for camera {CameraCode}: rtsp://***:***@{IP}:{Port}/Streaming/Channels/{StreamCode}",
            camera.Code, camera.CameraIP, _cameraSettings.RtspPort, streamCode);
        return url;
    }

    public async Task<CameraDownloadResult> DownloadVideoAsync(CameraDownloadRequest request, CancellationToken cancellationToken = default)
    {
        int userId = -1;
        await _downloadSemaphore.WaitAsync(cancellationToken);

        try
        {
            await progressNotifier.SendProgress(request.OrderId, request.OrderCode, 5, "Dang ket noi toi camera...", "connecting");

            if (!TryBuildLoginInfo(request.Camera, out var loginInfo, out string loginInfoError))
            {
                await progressNotifier.SendError(request.OrderId, request.OrderCode, loginInfoError);
                return Fail(loginInfoError);
            }

            if (!TryNormalizeClipWindow(request.Start, request.End, out DateTime normalizedEnd, out string clipWindowError))
            {
                await progressNotifier.SendError(request.OrderId, request.OrderCode, clipWindowError);
                return Fail(clipWindowError);
            }

            await WaitForRecordingReadyAsync(normalizedEnd, request.OrderId, request.OrderCode, cancellationToken);

            EnsureSdkInitialized();

            userId = await LoginCameraAsync(loginInfo, request.OrderId, request.OrderCode, cancellationToken);
            if (userId < 0)
            {
                return Fail("Login failed.");
            }

            var (downloadedPath, isTempFile) = await DownloadVideoInternalAsync(
                userId,
                request.OrderId,
                request.OrderCode,
                request.CameraChannel,
                loginInfo.CameraCode,
                request.Start,
                normalizedEnd,
                cancellationToken);

            if (string.IsNullOrWhiteSpace(downloadedPath))
            {
                string error = $"Khong the tai video tu camera {request.Camera.Code}.";
                await progressNotifier.SendError(request.OrderId, request.OrderCode, error);
                return Fail(error);
            }

            return new CameraDownloadResult
            {
                Success = true,
                FilePath = downloadedPath,
                IsTempFile = isTempFile,
            };
        }
        catch (OperationCanceledException)
        {
            return Fail("Download was cancelled.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error while downloading order {OrderCode} from camera {CameraCode}", request.OrderCode, request.Camera.Code);
            await progressNotifier.SendError(request.OrderId, request.OrderCode, $"Loi khi tai video: {ex.Message}");
            return Fail(ex.Message);
        }
        finally
        {
            StopCurrentDownload();
            await LogoutCameraAsync(userId);
            _downloadSemaphore.Release();
        }
    }

    private void EnsureSdkInitialized()
    {
        if (_sdkInitialized)
        {
            return;
        }

        lock (_sdkInitLock)
        {
            if (_sdkInitialized)
            {
                return;
            }

            bool sdkPathConfigured = HCNetSDKImport.TrySetSdkComponentPath(AppContext.BaseDirectory, out string componentPath, out uint componentPathError);
            if (!Directory.Exists(componentPath))
            {
                logger.LogWarning("HikVision SDK component path does not exist: {Path}", componentPath);
            }
            else if (!sdkPathConfigured)
            {
                logger.LogWarning("NET_DVR_SetSDKInitCfg failed for {Path}. Error={Error}", componentPath, componentPathError);
            }
            else
            {
                logger.LogInformation("HikVision SDK component path: {Path}", componentPath);
            }

            if (!HCNetSDKImport.NET_DVR_Init())
            {
                uint initError = HCNetSDKImport.NET_DVR_GetLastError();
                throw new InvalidOperationException($"NET_DVR_Init failed with error {initError}.");
            }

            HCNetSDKImport.NET_DVR_SetConnectTime(
                (uint)Math.Max(1000, _hikVisionSettings.SdkConnectTimeoutMs),
                (uint)Math.Max(1, _hikVisionSettings.SdkConnectRetryCount));

            string sdkLogPath = string.IsNullOrWhiteSpace(_hikVisionSettings.SdkLogPath)
                ? "C:\\SdkLog\\"
                : _hikVisionSettings.SdkLogPath;

            Directory.CreateDirectory(sdkLogPath);
            HCNetSDKImport.NET_DVR_SetLogToFile(3, sdkLogPath, true);

            _sdkInitialized = true;
            logger.LogInformation("HikVision SDK initialized. LogPath={LogPath}", sdkLogPath);
        }
    }

    private bool TryBuildLoginInfo(Camera camera, out CameraLoginInfo loginInfo, out string errorMessage)
    {
        loginInfo = null!;
        errorMessage = string.Empty;

        string ip = camera.CameraIP?.Trim() ?? string.Empty;
        string username = _cameraSettings.Username?.Trim() ?? string.Empty;
        string password = _cameraSettings.Password?.Trim() ?? string.Empty;
        int port = camera.SDKPort ?? _cameraSettings.DefaultSdkPort;

        if (string.IsNullOrWhiteSpace(ip))
        {
            errorMessage = $"Camera {camera.Code} chua cau hinh IP.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            errorMessage = "Thong tin dang nhap camera chua duoc cau hinh.";
            return false;
        }

        if (port is <= 0 or > ushort.MaxValue)
        {
            errorMessage = $"SDK port khong hop le cho camera {camera.Code}: {port}.";
            return false;
        }

        loginInfo = new CameraLoginInfo
        {
            CameraCode = string.IsNullOrWhiteSpace(camera.Code) ? camera.Id.ToString() : camera.Code,
            IpAddress = ip,
            Port = (ushort)port,
            Username = username,
            Password = password,
        };

        return true;
    }

    private bool TryNormalizeClipWindow(DateTime start, DateTime end, out DateTime normalizedEnd, out string errorMessage)
    {
        normalizedEnd = end;
        errorMessage = string.Empty;

        if (end <= start)
        {
            errorMessage = "Khoang thoi gian video khong hop le.";
            return false;
        }

        double minSeconds = Math.Max(1, _hikVisionSettings.MinimumClipDurationSeconds);
        if ((end - start).TotalSeconds < minSeconds)
        {
            errorMessage = $"Khoang video qua ngan. Toi thieu {minSeconds:0} giay.";
            return false;
        }

        double maxMinutes = Math.Max(1, _hikVisionSettings.MaximumClipDurationMinutes);
        if ((end - start).TotalMinutes > maxMinutes)
        {
            normalizedEnd = start.AddMinutes(maxMinutes);
            logger.LogWarning(
                "Clip duration was truncated from {OriginalMinutes:F2} minutes to {MaxMinutes:F2} minutes for stability.",
                (end - start).TotalMinutes,
                maxMinutes);
        }

        return true;
    }

    private async Task WaitForRecordingReadyAsync(DateTime clipEnd, string orderId, string orderCode, CancellationToken cancellationToken)
    {
        int readyDelaySeconds = Math.Max(0, _hikVisionSettings.RecordingReadyDelaySeconds);
        if (readyDelaySeconds == 0)
        {
            return;
        }

        DateTime readyAt = clipEnd.AddSeconds(readyDelaySeconds);
        TimeSpan waitTime = readyAt - DateTime.Now;
        if (waitTime <= TimeSpan.Zero)
        {
            return;
        }

        logger.LogInformation("Waiting {DelaySeconds} seconds for recording index to stabilize.", waitTime.TotalSeconds);
        await progressNotifier.SendProgress(orderId, orderCode, 8, "Dang cho camera dong bo recording...", "connecting");
        await Task.Delay(waitTime, cancellationToken);
    }

    private async Task<int> LoginCameraAsync(CameraLoginInfo loginInfo, string orderId, string orderCode, CancellationToken cancellationToken)
    {
        int maxAttempts = Math.Max(1, _hikVisionSettings.LoginRetryCount);
        int retryDelayMs = Math.Max(250, _hikVisionSettings.LoginRetryDelayMs);

        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            int userId = LoginCamera(loginInfo);
            if (userId >= 0)
            {
                logger.LogInformation(
                    "Camera login succeeded. Camera={CameraCode}, IP={IP}, Port={Port}, UserId={UserId}",
                    loginInfo.CameraCode,
                    loginInfo.IpAddress,
                    loginInfo.Port,
                    userId);
                return userId;
            }

            uint errorCode = HCNetSDKImport.NET_DVR_GetLastError();
            logger.LogWarning(
                "Camera login failed. Attempt={Attempt}/{MaxAttempts}, Camera={CameraCode}, IP={IP}, Port={Port}, Error={Error}",
                attempt,
                maxAttempts,
                loginInfo.CameraCode,
                loginInfo.IpAddress,
                loginInfo.Port,
                errorCode);

            if (attempt < maxAttempts)
            {
                await Task.Delay(retryDelayMs, cancellationToken);
            }
            else
            {
                await progressNotifier.SendError(orderId, orderCode, GetLoginErrorMessage(errorCode, loginInfo.IpAddress, loginInfo.Port));
            }
        }

        return -1;
    }

    private int LoginCamera(CameraLoginInfo loginInfo)
    {
        var sdkLoginInfo = new NET_DVR_USER_LOGIN_INFO
        {
            sDeviceAddress = new byte[129],
            sUserName = new byte[64],
            sPassword = new byte[64],
            byRes3 = new byte[119],
            wPort = loginInfo.Port,
            bUseAsynLogin = false,
        };

        CopyStringToBuffer(loginInfo.IpAddress, sdkLoginInfo.sDeviceAddress);
        CopyStringToBuffer(loginInfo.Username, sdkLoginInfo.sUserName);
        CopyStringToBuffer(loginInfo.Password, sdkLoginInfo.sPassword);

        var deviceInfo = new NET_DVR_DEVICEINFO_V40
        {
            struDeviceV30 = new NET_DVR_DEVICEINFO_V30
            {
                sSerialNumber = new byte[48],
                byRes2 = new byte[9],
            },
            byRes2 = new byte[243],
        };

        return HCNetSDKImport.NET_DVR_Login_V40(ref sdkLoginInfo, ref deviceInfo);
    }

    private async Task LogoutCameraAsync(int userId)
    {
        if (userId < 0)
        {
            return;
        }

        for (int attempt = 1; attempt <= 3; attempt++)
        {
            if (HCNetSDKImport.NET_DVR_Logout(userId))
            {
                logger.LogInformation("Camera logout succeeded. UserId={UserId}", userId);
                await Task.Delay(1000);
                return;
            }

            uint errorCode = HCNetSDKImport.NET_DVR_GetLastError();
            logger.LogWarning("Camera logout failed. Attempt={Attempt}/3, UserId={UserId}, Error={Error}", attempt, userId, errorCode);
            await Task.Delay(500);
        }
    }

    private async Task<(string filePath, bool isTempFile)> DownloadVideoInternalAsync(
        int userId,
        string orderId,
        string orderCode,
        uint channel,
        string cameraCode,
        DateTime start,
        DateTime end,
        CancellationToken cancellationToken)
    {
        await progressNotifier.SendProgress(orderId, orderCode, 10, "Bat dau thuc hien tai video...", "downloading");

        int maxAttempts = Math.Max(1, _hikVisionSettings.DownloadRetryCount);
        int retryBaseDelaySeconds = Math.Max(1, _hikVisionSettings.DownloadRetryBaseDelaySeconds);

        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var paths = BuildVideoPaths(orderCode, cameraCode, channel, start, end);
            Directory.CreateDirectory(paths.folderPath);
            var playbackWindow = BuildRetryPlaybackWindow(start, end, attempt);
            var playCondition = new NET_DVR_PLAYCOND
            {
                dwChannel = channel,
                byRes = new byte[63],
                struStartTime = ToSdkTime(playbackWindow.start),
                struStopTime = ToSdkTime(playbackWindow.end),
            };

            if (attempt > 1)
            {
                int retryDelaySeconds = retryBaseDelaySeconds * attempt;
                logger.LogWarning(
                    "Retrying download. Attempt={Attempt}/{MaxAttempts}, DelaySeconds={DelaySeconds}, Camera={CameraCode}, Window={WindowStart:HH:mm:ss}-{WindowEnd:HH:mm:ss}",
                    attempt,
                    maxAttempts,
                    retryDelaySeconds,
                    cameraCode,
                    playbackWindow.start,
                    playbackWindow.end);
                await Task.Delay(TimeSpan.FromSeconds(retryDelaySeconds), cancellationToken);
            }

            int downHandle = HCNetSDKImport.NET_DVR_GetFileByTime_V40(userId, paths.rawFilePath, ref playCondition);
            if (downHandle < 0)
            {
                uint getFileError = HCNetSDKImport.NET_DVR_GetLastError();
                logger.LogWarning(
                    "NET_DVR_GetFileByTime_V40 failed. Attempt={Attempt}/{MaxAttempts}, Camera={CameraCode}, Error={Error}",
                    attempt,
                    maxAttempts,
                    cameraCode,
                    getFileError);
                continue;
            }

            lock (_handleLock)
            {
                _currentDownHandle = downHandle;
            }

            try
            {
                uint outputValue = 0;
                if (!HCNetSDKImport.NET_DVR_PlayBackControl_V40(
                        downHandle,
                        HCNetSDKImport.NET_DVR_PLAYSTART,
                        IntPtr.Zero,
                        0,
                        IntPtr.Zero,
                        ref outputValue))
                {
                    uint playStartError = HCNetSDKImport.NET_DVR_GetLastError();
                    logger.LogError(
                        "NET_DVR_PLAYSTART failed. Handle={Handle}, Camera={CameraCode}, Error={Error}",
                        downHandle,
                        cameraCode,
                        playStartError);
                    TryStopDownloadHandle(downHandle, "play-start failure");
                    CleanupFile(paths.rawFilePath);
                    continue;
                }

                bool downloadCompleted = await MonitorDownloadProgressAsync(downHandle, orderId, orderCode, cancellationToken);
                if (!downloadCompleted)
                {
                    CleanupFile(paths.rawFilePath);
                    continue;
                }

                long fileSize = await WaitForDownloadedFileAsync(paths.rawFilePath, cancellationToken);
                if (fileSize < _hikVisionSettings.MinimumDownloadedFileBytes)
                {
                    logger.LogWarning(
                        "Downloaded file is missing or too small after success. Path={Path}, Size={Size}, MinSize={MinSize}",
                        paths.rawFilePath,
                        fileSize,
                        _hikVisionSettings.MinimumDownloadedFileBytes);
                    CleanupFile(paths.rawFilePath);
                    continue;
                }

                logger.LogInformation("Download completed. Camera={CameraCode}, Path={Path}, Size={Size}", cameraCode, paths.rawFilePath, fileSize);
                await progressNotifier.SendProgress(orderId, orderCode, 55, "Dang chuyen doi dinh dang video...", "converting");

                bool convertSuccess = await ConvertVideoAsync(paths.rawFilePath, paths.convertedFilePath, orderId, orderCode, cancellationToken);
                if (convertSuccess)
                {
                    CleanupFile(paths.rawFilePath);
                    return (paths.convertedFilePath, false);
                }

                logger.LogWarning("Video conversion failed. Falling back to raw file for camera {CameraCode}", cameraCode);
                return (paths.rawFilePath, true);
            }
            finally
            {
                lock (_handleLock)
                {
                    if (_currentDownHandle == downHandle)
                    {
                        _currentDownHandle = -1;
                    }
                }
            }
        }

        logger.LogError("Download failed after {MaxAttempts} attempts for order {OrderCode}, camera {CameraCode}", maxAttempts, orderCode, cameraCode);
        return (string.Empty, false);
    }

    private async Task<bool> MonitorDownloadProgressAsync(int downHandle, string orderId, string orderCode, CancellationToken cancellationToken)
    {
        int maxAttempts = Math.Max(1, _hikVisionSettings.DownloadTimeoutAttempts);
        int pollIntervalMs = Math.Max(1000, _hikVisionSettings.DownloadProgressPollIntervalMs);
        const int startProgress = 15;
        const int endProgress = 50;

        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            await Task.Delay(pollIntervalMs, cancellationToken);

            int downloadPosition = HCNetSDKImport.NET_DVR_GetDownloadPos(downHandle);
            logger.LogInformation("Download progress. Handle={Handle}, Position={Position}", downHandle, downloadPosition);

            int mappedProgress = startProgress + (int)((double)attempt / maxAttempts * (endProgress - startProgress));
            await progressNotifier.SendProgress(
                orderId,
                orderCode,
                Math.Min(mappedProgress, endProgress),
                $"Dang tai video tu camera... {Math.Max(downloadPosition, 0)}%",
                "downloading");

            if (downloadPosition == 100)
            {
                await progressNotifier.SendProgress(orderId, orderCode, 50, "Tai video hoan tat", "downloading");
                return TryStopDownloadHandle(downHandle, "download completed");
            }

            if (downloadPosition == 200)
            {
                logger.LogError("Download failed because the device reported network abnormal state.");
                TryStopDownloadHandle(downHandle, "network abnormal");
                return false;
            }

            if (downloadPosition < 0 || downloadPosition > 100)
            {
                logger.LogError("Download failed because the device returned an invalid progress value {Progress}", downloadPosition);
                TryStopDownloadHandle(downHandle, "invalid progress");
                return false;
            }
        }

        logger.LogError("Download timed out after {MaxAttempts} polling attempts.", maxAttempts);
        TryStopDownloadHandle(downHandle, "timeout");
        return false;
    }

    private async Task<bool> ConvertVideoAsync(string inputPath, string outputPath, string orderId, string orderCode, CancellationToken cancellationToken)
    {
        try
        {
            string ffmpegPath = Path.GetFullPath(_fileSettings.FfmpegPath);
            if (!File.Exists(ffmpegPath))
            {
                logger.LogError("FFmpeg executable was not found at {Path}", ffmpegPath);
                return false;
            }

            if (File.Exists(outputPath))
            {
                File.Delete(outputPath);
            }

            var errorBuilder = new StringBuilder();
            var processStartInfo = new ProcessStartInfo
            {
                FileName = ffmpegPath,
                Arguments = $"-y -i \"{inputPath}\" -c:v libx264 -preset superfast -crf 28 -c:a aac \"{outputPath}\"",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };

            using var process = new Process { StartInfo = processStartInfo };
            process.ErrorDataReceived += (_, args) =>
            {
                if (!string.IsNullOrWhiteSpace(args.Data))
                {
                    errorBuilder.AppendLine(args.Data);
                }
            };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            int timeoutMs = Math.Max(1, _hikVisionSettings.FfmpegTimeoutMinutes) * 60 * 1000;
            int intervalMs = 10000;
            int totalSteps = Math.Max(1, timeoutMs / intervalMs);

            var progressTask = Task.Run(async () =>
            {
                double currentProgress = 55;
                double step = (95d - 55d) / totalSteps;

                while (!process.HasExited && currentProgress < 95)
                {
                    await Task.Delay(intervalMs, cancellationToken);
                    if (!process.HasExited)
                    {
                        currentProgress = Math.Min(currentProgress + step, 95);
                        await progressNotifier.SendProgress(
                            orderId,
                            orderCode,
                            (int)Math.Round(currentProgress),
                            "Dang chuyen doi dinh dang video...",
                            "converting");
                    }
                }
            }, cancellationToken);

            bool exited = await Task.Run(() => process.WaitForExit(timeoutMs), cancellationToken);
            if (!exited)
            {
                try
                {
                    process.Kill(true);
                }
                catch (Exception killEx)
                {
                    logger.LogWarning(killEx, "Failed to terminate FFmpeg after timeout.");
                }

                await progressTask;
                CleanupFile(outputPath);
                logger.LogError("FFmpeg timed out after {TimeoutMinutes} minutes.", _hikVisionSettings.FfmpegTimeoutMinutes);
                return false;
            }

            await progressTask;

            if (process.ExitCode != 0)
            {
                logger.LogError("FFmpeg exited with code {ExitCode}. Error: {ErrorOutput}", process.ExitCode, errorBuilder.ToString());
                CleanupFile(outputPath);
                return false;
            }

            if (!File.Exists(outputPath) || new FileInfo(outputPath).Length <= 0)
            {
                logger.LogError("FFmpeg finished but output file is missing or empty. OutputPath={OutputPath}", outputPath);
                CleanupFile(outputPath);
                return false;
            }

            await progressNotifier.SendProgress(orderId, orderCode, 95, "Chuyen doi video hoan tat", "converting");
            return true;
        }
        catch (OperationCanceledException)
        {
            CleanupFile(outputPath);
            return false;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error while converting video.");
            CleanupFile(outputPath);
            return false;
        }
    }

    private (string folderPath, string rawFilePath, string convertedFilePath) BuildVideoPaths(
        string orderCode,
        string cameraCode,
        uint channel,
        DateTime start,
        DateTime end)
    {
        DateTime now = DateTime.Now;
        string folder = start.ToString("ddMMyyyy");
        string fileName = $"{orderCode}-{cameraCode}-{start:ddMMyyyy-HHmmss}-{end:HHmmss}-{now:ddMMyy-HHmmss}-{channel}.mp4";
        string folderPath = Path.Combine(_fileSettings.UploadPath, folder);
        string rawFilePath = Path.Combine(folderPath, fileName);
        string convertedFilePath = rawFilePath.Replace(".mp4", "_resized.mp4", StringComparison.OrdinalIgnoreCase);
        return (folderPath, rawFilePath, convertedFilePath);
    }

    private (DateTime start, DateTime end) BuildRetryPlaybackWindow(DateTime start, DateTime end, int attempt)
    {
        int paddingSeconds = Math.Max(0, _hikVisionSettings.RetryWindowPaddingSeconds) * Math.Max(0, attempt - 1);
        if (paddingSeconds == 0)
        {
            return (start, end);
        }

        return (start.AddSeconds(-paddingSeconds), end.AddSeconds(paddingSeconds));
    }

    private async Task<long> WaitForDownloadedFileAsync(string filePath, CancellationToken cancellationToken)
    {
        int timeoutSeconds = Math.Max(1, _hikVisionSettings.DownloadFileReadyTimeoutSeconds);
        int pollIntervalMs = Math.Max(250, _hikVisionSettings.DownloadFileReadyPollIntervalMs);
        int maxAttempts = Math.Max(1, (timeoutSeconds * 1000) / pollIntervalMs);

        long lastSize = -1;
        int stableCount = 0;

        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            await Task.Delay(pollIntervalMs, cancellationToken);

            if (!File.Exists(filePath))
            {
                continue;
            }

            long currentSize = new FileInfo(filePath).Length;
            if (currentSize <= 0)
            {
                lastSize = currentSize;
                continue;
            }

            if (currentSize == lastSize)
            {
                stableCount++;
            }
            else
            {
                stableCount = 0;
                lastSize = currentSize;
            }

            if (stableCount >= 1)
            {
                return currentSize;
            }
        }

        return File.Exists(filePath) ? new FileInfo(filePath).Length : 0;
    }

    private static NET_DVR_TIME ToSdkTime(DateTime value) => new()
    {
        dwYear = (uint)value.Year,
        dwMonth = (uint)value.Month,
        dwDay = (uint)value.Day,
        dwHour = (uint)value.Hour,
        dwMinute = (uint)value.Minute,
        dwSecond = (uint)value.Second,
    };

    private bool TryStopDownloadHandle(int downHandle, string reason)
    {
        if (downHandle < 0)
        {
            return true;
        }

        if (HCNetSDKImport.NET_DVR_StopGetFile(downHandle))
        {
            return true;
        }

        uint errorCode = HCNetSDKImport.NET_DVR_GetLastError();
        logger.LogWarning("NET_DVR_StopGetFile failed for handle {Handle}. Reason={Reason}, Error={Error}", downHandle, reason, errorCode);
        return false;
    }

    private void StopCurrentDownload()
    {
        lock (_handleLock)
        {
            if (_currentDownHandle < 0)
            {
                return;
            }

            try
            {
                TryStopDownloadHandle(_currentDownHandle, "service cleanup");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to stop active download handle {Handle}", _currentDownHandle);
            }
            finally
            {
                _currentDownHandle = -1;
            }
        }
    }

    private void CleanupFile(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
        {
            return;
        }

        try
        {
            File.Delete(filePath);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to delete file {Path}", filePath);
        }
    }

    private string GetLoginErrorMessage(uint errorCode, string ipAddress, ushort port)
    {
        return errorCode switch
        {
            1 => $"Khong the ket noi toi camera {ipAddress}:{port}.",
            2 => "Tai khoan hoac mat khau camera khong dung.",
            3 => "Phien dang nhap camera khong hop le.",
            4 => "Loi mang khi ket noi toi camera.",
            5 => "Camera da dat toi da so phien dang nhap.",
            6 => "SDK khong tuong thich voi thiet bi.",
            7 => "Camera da ngat ket noi.",
            _ => $"Khong the ket noi toi camera {ipAddress}:{port} (ma loi {errorCode}).",
        };
    }

    private static void CopyStringToBuffer(string value, byte[] buffer)
    {
        Array.Clear(buffer);
        byte[] bytes = Encoding.Default.GetBytes(value);
        int length = Math.Min(bytes.Length, buffer.Length - 1);
        Array.Copy(bytes, buffer, length);
    }

    private static string GetExplicitProvider(Camera camera)
    {
        if (string.IsNullOrWhiteSpace(camera.Note))
        {
            return string.Empty;
        }

        const string prefix = "provider:";
        foreach (string segment in camera.Note.Split([';', '\n', '\r'], StringSplitOptions.RemoveEmptyEntries))
        {
            string trimmed = segment.Trim();
            if (!trimmed.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            return trimmed[prefix.Length..].Trim().ToLowerInvariant();
        }

        return string.Empty;
    }

    private static CameraDownloadResult Fail(string message) => new()
    {
        Success = false,
        ErrorMessage = message,
    };

    private sealed class CameraLoginInfo
    {
        public required string CameraCode { get; init; }
        public required string IpAddress { get; init; }
        public required ushort Port { get; init; }
        public required string Username { get; init; }
        public required string Password { get; init; }
    }
}
