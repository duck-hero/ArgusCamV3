using System.Runtime.InteropServices;

namespace ArgusCam.Infrastructure.HikVision.Native;

[StructLayout(LayoutKind.Sequential)]
public struct NET_DVR_DEVICEINFO_V30
{
    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 48)]
    public byte[] sSerialNumber;

    public byte byAlarmInPortNum;
    public byte byAlarmOutPortNum;
    public byte byDiskNum;
    public byte byDVRType;
    public byte byChanNum;
    public byte byStartChan;
    public byte byAudioChanNum;
    public byte byIPChanNum;
    public byte byZeroChanNum;
    public byte byMainProto;
    public byte bySubProto;
    public byte bySupport;
    public byte bySupport1;
    public byte bySupport2;
    public ushort wDevType;
    public byte bySupport3;

    public byte byMultiStreamProto;
    public byte byStartDChan;
    public byte byStartDTalkChan;
    public byte byHighDChanNum;
    public byte bySupport4;
    public byte byLanguageType;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 9)]
    public byte[] byRes2;

    public int GetTotalIPChannels() => byHighDChanNum * 256 + byIPChanNum;

    public int GetDigitalStartChannel() => byStartDChan > 0 ? byStartDChan : (byStartChan + byChanNum);
}

[StructLayout(LayoutKind.Sequential)]
public struct NET_DVR_DEVICEINFO_V40
{
    public NET_DVR_DEVICEINFO_V30 struDeviceV30;
    public byte bySupportLock;
    public byte byRetryLoginTime;
    public byte byPasswordLevel;
    public byte byProxyType;
    public uint dwSurplusLockTime;
    public byte byCharEncodeType;
    public byte bySupportDev5;
    public byte bySupport;
    public byte byLoginMode;
    public int dwOEMCode;
    public int iResidualValidity;
    public byte byResidualValidity;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 243)]
    public byte[] byRes2;
}

[StructLayout(LayoutKind.Sequential)]
public struct NET_DVR_USER_LOGIN_INFO
{
    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 129)]
    public byte[] sDeviceAddress;

    public byte byUseTransport;
    public ushort wPort;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 64)]
    public byte[] sUserName;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 64)]
    public byte[] sPassword;

    public IntPtr cbLoginResult;
    public IntPtr pUser;
    public bool bUseAsynLogin;
    public byte byProxyType;
    public byte byUseUTCTime;
    public byte byLoginMode;
    public byte byHttps;
    public int iProxyID;
    public byte byVerifyMode;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 119)]
    public byte[] byRes3;
}

[StructLayout(LayoutKind.Sequential)]
public struct NET_DVR_TIME
{
    public uint dwYear;
    public uint dwMonth;
    public uint dwDay;
    public uint dwHour;
    public uint dwMinute;
    public uint dwSecond;
}

[StructLayout(LayoutKind.Sequential)]
public struct NET_DVR_PLAYCOND
{
    public uint dwChannel;
    public NET_DVR_TIME struStartTime;
    public NET_DVR_TIME struStopTime;
    public byte byDrawFrame;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 63)]
    public byte[] byRes;
}

// Used by NET_DVR_SetSDKInitCfg to point HCNetSDK at the HCNetSDKCom folder.
[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
public struct NET_DVR_LOCAL_SDK_PATH
{
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)]
    public string sPath;

    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 128)]
    public byte[] byRes;
}

public static class HCNetSDKImport
{
    private const string DLL_PATH = "HCNetSDK.dll";
    private const uint NET_SDK_INIT_CFG_SDK_PATH = 2;

    public const uint NET_DVR_GET_TIMECFG = 118;
    public const uint NET_DVR_SET_TIMECFG = 119;
    public const uint NET_DVR_PLAYSTART = 1;

    public static bool TrySetSdkComponentPath(string baseDirectory, out string componentPath, out uint errorCode)
    {
        componentPath = Path.Combine(baseDirectory, "HCNetSDKCom");
        errorCode = 0;

        if (!Directory.Exists(componentPath))
        {
            return false;
        }

        var localSdkPath = new NET_DVR_LOCAL_SDK_PATH
        {
            sPath = componentPath.EndsWith(Path.DirectorySeparatorChar)
                ? componentPath
                : componentPath + Path.DirectorySeparatorChar,
            byRes = new byte[128]
        };

        if (NET_DVR_SetSDKInitCfg(NET_SDK_INIT_CFG_SDK_PATH, ref localSdkPath))
        {
            return true;
        }

        errorCode = NET_DVR_GetLastError();
        return false;
    }

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern bool NET_DVR_Init();

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern bool NET_DVR_SetSDKInitCfg(uint enumType, ref NET_DVR_LOCAL_SDK_PATH lpInBuff);

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern bool NET_DVR_Cleanup();

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern uint NET_DVR_GetLastError();

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern IntPtr NET_DVR_GetErrorMsg(ref int pErrorNo);

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern bool NET_DVR_SetConnectTime(uint dwWaitTime, uint dwTryTimes);

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern bool NET_DVR_SetLogToFile(int nLogLevel, string strLogDir, bool bAutoDel);

    // Login V30 (used by HardwareScanService)
    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern int NET_DVR_Login_V30(
        string sDVRIP,
        ushort wDVRPort,
        string sUserName,
        string sPassword,
        ref NET_DVR_DEVICEINFO_V30 lpDeviceInfo);

    // Login V40 (used by VideoDownloadService)
    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern int NET_DVR_Login_V40(
        ref NET_DVR_USER_LOGIN_INFO pLoginInfo,
        ref NET_DVR_DEVICEINFO_V40 lpDeviceInfo);

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern bool NET_DVR_Logout(int iUserID);

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern bool NET_DVR_GetDVRConfig(
        int lUserID,
        uint dwCommand,
        int lChannel,
        IntPtr lpOutBuffer,
        uint dwOutBufferSize,
        ref uint lpBytesReturned);

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern bool NET_DVR_SetDVRConfig(
        int lUserID,
        uint dwCommand,
        int lChannel,
        IntPtr lpInBuffer,
        uint dwInBufferSize);

    // Download by time range
    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern int NET_DVR_GetFileByTime_V40(
        int lUserID,
        string sSavedFileName,
        ref NET_DVR_PLAYCOND pDownloadCond);

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern bool NET_DVR_StopGetFile(int lFileHandle);

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern int NET_DVR_GetDownloadPos(int lFileHandle);

    [DllImport(DLL_PATH, CharSet = CharSet.Ansi)]
    public static extern bool NET_DVR_PlayBackControl_V40(
        int lPlayHandle,
        uint dwControlCode,
        IntPtr lpInValue,
        uint dwInValueSize,
        IntPtr lpOutValue,
        ref uint lpOutValueSize);
}
