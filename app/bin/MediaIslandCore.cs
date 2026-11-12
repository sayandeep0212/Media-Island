using System;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Management;

namespace MediaIslandCore {
    [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioEndpointVolume {
        [PreserveSig] int RegisterControlChangeNotify(IntPtr pNotify);
        [PreserveSig] int UnregisterControlChangeNotify(IntPtr pNotify);
        [PreserveSig] int GetChannelCount(out uint pnChannelCount);
        [PreserveSig] int SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
        [PreserveSig] int SetMasterVolumeLevelScalar(float fLevel, ref Guid pguidEventContext);
        [PreserveSig] int GetMasterVolumeLevel(out float pfLevelDB);
        [PreserveSig] int GetMasterVolumeLevelScalar(out float pfLevel);
        [PreserveSig] int SetChannelVolumeLevel(uint nChannel, float fLevelDB, ref Guid pguidEventContext);
        [PreserveSig] int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, ref Guid pguidEventContext);
        [PreserveSig] int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
        [PreserveSig] int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
        [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, ref Guid pguidEventContext);
        [PreserveSig] int GetMute(out bool pbMute);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDevice {
        [PreserveSig] int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDeviceEnumerator {
        [PreserveSig] int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
        [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppEndpoint);
        [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string pwstrId, out IMMDevice ppDevice);
        [PreserveSig] int RegisterEndpointNotificationCallback(IntPtr pClient);
        [PreserveSig] int UnregisterEndpointNotificationCallback(IntPtr pClient);
    }

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    public class MMDeviceEnumeratorComObject { }

    class Program {
        [DllImport("user32.dll")]
        public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
        public const byte VK_MEDIA_NEXT_TRACK = 0xB0;
        public const byte VK_MEDIA_PREV_TRACK = 0xB1;
        public const byte VK_MEDIA_STOP = 0xB2;
        public const byte VK_MEDIA_PLAY_PAUSE = 0xB3;
        public const byte VK_VOLUME_MUTE = 0xAD;
        public const byte VK_VOLUME_DOWN = 0xAE;
        public const byte VK_VOLUME_UP = 0xAF;
        public const uint KEYEVENTF_KEYUP = 0x0002;

        public static void PressKey(byte key) {
            keybd_event(key, 0, 0, UIntPtr.Zero);
            keybd_event(key, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        }

        static IAudioEndpointVolume GetVolumeController() {
            try {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
                IMMDevice dev = null;
                enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
                if (dev == null) return null;
                Guid IID_IAudioEndpointVolume = typeof(IAudioEndpointVolume).GUID;
                object aev = null;
                dev.Activate(ref IID_IAudioEndpointVolume, 23, IntPtr.Zero, out aev);
                return (IAudioEndpointVolume)aev;
            } catch { return null; }
        }

        static int GetVolume() {
            try {
                var ctrl = GetVolumeController();
                if (ctrl == null) return -1;
                float vol = 0;
                ctrl.GetMasterVolumeLevelScalar(out vol);
                return (int)Math.Round(vol * 100);
            } catch { return -1; }
        }

        static bool SetVolume(int level) {
            try {
                var ctrl = GetVolumeController();
                if (ctrl == null) return false;
                float val = Math.Max(0f, Math.Min(100f, (float)level)) / 100f;
                Guid empty = Guid.Empty;
                ctrl.SetMasterVolumeLevelScalar(val, ref empty);
                return true;
            } catch { return false; }
        }

        static int GetBrightness() {
            try {
                var searcher = new ManagementObjectSearcher(@"root\WMI", "SELECT CurrentBrightness FROM WmiMonitorBrightness");
                foreach (ManagementObject obj in searcher.Get()) {
                    return Convert.ToInt32(obj["CurrentBrightness"]);
                }
            } catch {}
            return -1;
        }

        static bool SetBrightness(int target) {
            try {
                var s = new ManagementObjectSearcher(@"root\WMI", "SELECT * FROM WmiMonitorBrightnessMethods");
                foreach (ManagementObject obj in s.Get()) {
                    obj.InvokeMethod("WmiSetBrightness", new object[] { 1, target });
                    return true;
                }
            } catch {}
            return false;
        }

        delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
        [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)] static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
        [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
        [DllImport("user32.dll", SetLastError = true)] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        static void GetSpotifyStatus(out bool isRunning, out bool isPlaying, out string title, out string artist) {
            isRunning = false;
            isPlaying = false;
            title = "";
            artist = "";

            string foundTitle = null;
            bool procFound = false;

            EnumWindows((hWnd, lParam) => {
                if (!IsWindowVisible(hWnd)) return true;
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                try {
                    var proc = Process.GetProcessById((int)pid);
                    if (proc.ProcessName.ToLower().Contains("spotify")) {
                        procFound = true;
                        StringBuilder sb = new StringBuilder(512);
                        GetWindowText(hWnd, sb, 512);
                        string t = sb.ToString();
                        if (!string.IsNullOrWhiteSpace(t) && t != "Spotify" && t != "Spotify Free" && t != "Spotify Premium") {
                            foundTitle = t;
                            return false; // Stop
                        }
                    }
                } catch {}
                return true;
            }, IntPtr.Zero);

            isRunning = procFound;
            if (foundTitle != null) {
                isPlaying = true;
                // Parse "Artist - Title"
                int dashIdx = foundTitle.IndexOf(" - ");
                if (dashIdx > 0) {
                    artist = foundTitle.Substring(0, dashIdx).Trim();
                    title = foundTitle.Substring(dashIdx + 3).Trim();
                } else {
                    title = foundTitle.Trim();
                    artist = "Spotify";
                }
            }
        }

        static string EscapeJson(string s) {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", " ").Replace("\r", " ");
        }

        static void Main(string[] args) {
            if (args.Length == 0 || args[0].ToLower() == "status") {
                bool isRunning, isPlaying;
                string t, a;
                GetSpotifyStatus(out isRunning, out isPlaying, out t, out a);
                int vol = GetVolume();
                int bright = GetBrightness();

                Console.WriteLine("{\"volume\":" + vol + ",\"brightness\":" + bright + ",\"spotify\":{\"running\":" + (isRunning ? "true" : "false") + ",\"playing\":" + (isPlaying ? "true" : "false") + ",\"title\":\"" + EscapeJson(t) + "\",\"artist\":\"" + EscapeJson(a) + "\"}}");
                return;
            }

            string cmd = args[0].ToLower();
            if (cmd == "spotify") {
                bool isRunning, isPlaying;
                string t, a;
                GetSpotifyStatus(out isRunning, out isPlaying, out t, out a);
                Console.WriteLine("{\"running\":" + (isRunning ? "true" : "false") + ",\"playing\":" + (isPlaying ? "true" : "false") + ",\"title\":\"" + EscapeJson(t) + "\",\"artist\":\"" + EscapeJson(a) + "\"}");
                return;
            } else if (cmd == "vol_get") {
                Console.WriteLine(GetVolume());
            } else if (cmd == "vol_set" && args.Length > 1) {
                int v;
                if (int.TryParse(args[1], out v)) {
                    SetVolume(v);
                    Console.WriteLine(GetVolume());
                }
            } else if (cmd == "bright_get") {
                Console.WriteLine(GetBrightness());
            } else if (cmd == "bright_set" && args.Length > 1) {
                int b;
                if (int.TryParse(args[1], out b)) {
                    SetBrightness(b);
                    Console.WriteLine(GetBrightness());
                }
            } else if (cmd == "media" && args.Length > 1) {
                string action = args[1].ToLower();
                if (action == "playpause" || action == "toggle") PressKey(VK_MEDIA_PLAY_PAUSE);
                else if (action == "next") PressKey(VK_MEDIA_NEXT_TRACK);
                else if (action == "prev" || action == "previous") PressKey(VK_MEDIA_PREV_TRACK);
                else if (action == "stop") PressKey(VK_MEDIA_STOP);
                else if (action == "volup") PressKey(VK_VOLUME_UP);
                else if (action == "voldown") PressKey(VK_VOLUME_DOWN);
                else if (action == "mute") PressKey(VK_VOLUME_MUTE);
                Console.WriteLine("OK");
            } else if (cmd == "launch" && args.Length > 1) {
                try {
                    string target = args[1];
                    Process.Start(new ProcessStartInfo(target) { UseShellExecute = true });
                    Console.WriteLine("LAUNCHED:" + target);
                } catch (Exception ex) {
                    Console.WriteLine("ERROR:" + ex.Message);
                }
            }
        }
    }
}

