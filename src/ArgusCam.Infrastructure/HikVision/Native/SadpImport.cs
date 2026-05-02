using System.Runtime.InteropServices;

namespace ArgusCam.Infrastructure.HikVision.Native;

public static class SadpImport
{
    private const string DLL_PATH = "Sadp.dll";

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    public delegate void PUSER_NOTIFY_CALLBACK(IntPtr pDevNetParam, IntPtr pUserData);

    [DllImport(DLL_PATH, CallingConvention = CallingConvention.StdCall)]
    public static extern int SADP_Start_V30(PUSER_NOTIFY_CALLBACK pUserNotifyCallBack, int bInstallDriver, IntPtr pUserData);

    [DllImport(DLL_PATH, CallingConvention = CallingConvention.StdCall, EntryPoint = "SADP_Start_V40")]
    public static extern int SADP_Start_V40(PUSER_NOTIFY_CALLBACK pUserNotifyCallBack, int bInstallDriver, IntPtr pUserData);

    [DllImport(DLL_PATH, CallingConvention = CallingConvention.StdCall)]
    public static extern int SADP_Stop();

    [DllImport(DLL_PATH, CallingConvention = CallingConvention.StdCall)]
    public static extern uint SADP_GetLastError();
}
