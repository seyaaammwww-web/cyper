using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace CafeClient
{
    /// <summary>
    /// Executes power actions on the local machine on behalf of the manager.
    /// Uses shutdown.exe for shutdown/restart (reliable, gives a short grace
    /// window) and the Win32 SetSuspendState for sleep.
    /// </summary>
    public static class PowerController
    {
        [DllImport("powrprof.dll", SetLastError = true)]
        private static extern bool SetSuspendState(bool hibernate, bool forceCritical, bool disableWakeEvent);

        public static void Shutdown(int graceSeconds = 10)
        {
            RunShutdown($"/s /t {graceSeconds} /c \"Session ended - shutting down\"");
        }

        public static void Restart(int graceSeconds = 10)
        {
            RunShutdown($"/r /t {graceSeconds} /c \"Restarting\"");
        }

        public static void Sleep()
        {
            try
            {
                SetSuspendState(false, false, false);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Sleep failed: {ex.Message}");
            }
        }

        /// <summary>Cancel a pending shutdown/restart if one was scheduled.</summary>
        public static void AbortPendingPowerAction()
        {
            RunShutdown("/a");
        }

        private static void RunShutdown(string arguments)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "shutdown.exe",
                    Arguments = arguments,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                };
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Power action failed: {ex.Message}");
            }
        }
    }
}
