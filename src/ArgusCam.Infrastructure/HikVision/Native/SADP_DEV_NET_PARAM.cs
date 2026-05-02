using System.Runtime.InteropServices;
using System.Text;

namespace ArgusCam.Infrastructure.HikVision.Native;

[StructLayout(LayoutKind.Sequential, Pack = 1)]
public struct SADP_DEV_NET_PARAM
{
    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 12)]
    public byte[] szSeries;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 48)]
    public byte[] szSerialNO;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 20)]
    public byte[] szMAC;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 16)]
    public byte[] szIPv4Address;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 16)]
    public byte[] szIPv4SubNetMask;

    public uint dwDeviceType;
    public ushort wPort;
    public byte byEncodeChannelNum;
    public byte byIPType;
    public byte byActivated;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
    public byte[] byRes1;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 128)]
    public byte[] szIPv6Address;

    public byte byIPv6MaskLen;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 16)]
    public byte[] szIPv4Gateway;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 128)]
    public byte[] szIPv6Gateway;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 128)]
    public byte[] byRes2;

    private string ByteArrayToString(byte[] bytes)
    {
        if (bytes == null) return string.Empty;
        int nullIndex = Array.IndexOf(bytes, (byte)0);
        int length = (nullIndex >= 0) ? nullIndex : bytes.Length;
        if (length == 0) return string.Empty;
        return Encoding.ASCII.GetString(bytes, 0, length).Trim();
    }

    private string GetStringFromBytes(byte[] bytes)
    {
        if (bytes == null || bytes.Length == 0) return string.Empty;

        int start = -1;
        int end = -1;

        for (int i = 0; i < bytes.Length; i++)
        {
            if (bytes[i] >= 32 && bytes[i] <= 126)
            {
                if (start == -1) start = i;
                end = i;
            }
            else if (start != -1)
            {
                break;
            }
        }

        if (start != -1)
        {
            return Encoding.ASCII.GetString(bytes, start, end - start + 1).Trim();
        }

        return string.Empty;
    }

    public string GetSerialNo() => ByteArrayToString(szSerialNO);
    public string GetMAC() => ByteArrayToString(szMAC);
    public string GetIPv4() => ByteArrayToString(szIPv4Address);
    public string GetModel() => GetStringFromBytes(szIPv6Gateway);
    public string GetSoftwareVersion() => GetStringFromBytes(szIPv6Address);
}
