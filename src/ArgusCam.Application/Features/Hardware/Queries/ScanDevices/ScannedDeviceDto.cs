namespace ArgusCam.Application.Features.Hardware.Queries.ScanDevices;

public class ScannedDeviceDto
{
    public string Model { get; set; } = "";
    public string SerialNo { get; set; } = "";
    public string SoftwareVersion { get; set; } = "";
    public string IPAddress { get; set; } = "";
    public string MACAddress { get; set; } = "";
    public ushort SDKPort { get; set; }
    public int Channel { get; set; }
    public string DeviceType { get; set; } = "";

    /// <summary>
    /// True nếu thiết bị là đầu thu NVR/DVR (có ít nhất 1 IP channel hoặc analog channel).
    /// False nếu là camera IP đơn lẻ (IPC).
    /// </summary>
    public bool IsNvr { get; set; }

    /// <summary>
    /// True nếu SDK login thành công. Khi false, IsNvr không đáng tin (fallback 1 channel).
    /// </summary>
    public bool LoginSuccess { get; set; }
}
