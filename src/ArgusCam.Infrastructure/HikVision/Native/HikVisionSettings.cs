namespace ArgusCam.Infrastructure.HikVision.Native;

public class HikVisionSettings
{
    public const string SectionName = "HikVision";

    public int ScanTimeoutMs { get; set; } = 30000;
    public int QuietPeriodMs { get; set; } = 5000;
    public int SdkConnectTimeoutMs { get; set; } = 5000;
    public int SdkConnectRetryCount { get; set; } = 3;
    public int LoginRetryCount { get; set; } = 3;
    public int LoginRetryDelayMs { get; set; } = 1000;
    public int DownloadRetryCount { get; set; } = 3;
    public int DownloadRetryBaseDelaySeconds { get; set; } = 3;
    public int DownloadProgressPollIntervalMs { get; set; } = 6000;
    public int DownloadTimeoutAttempts { get; set; } = 60;
    public int DownloadFileReadyTimeoutSeconds { get; set; } = 15;
    public int DownloadFileReadyPollIntervalMs { get; set; } = 1000;
    public long MinimumDownloadedFileBytes { get; set; } = 1024;
    public int RetryWindowPaddingSeconds { get; set; } = 5;
    public int MinimumClipDurationSeconds { get; set; } = 5;
    public int MaximumClipDurationMinutes { get; set; } = 15;
    public int RecordingReadyDelaySeconds { get; set; } = 8;
    public int FfmpegTimeoutMinutes { get; set; } = 15;
    public string SdkLogPath { get; set; } = "C:\\SdkLog\\";
}
