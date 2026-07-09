using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace CafeClient
{
    internal static class Program
    {
        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("kernel32.dll")]
        private static extern IntPtr GetConsoleWindow();

        private const int SW_HIDE = 0;
        private const int SW_SHOW = 5;

        [STAThread]
        static void Main(string[] args)
        {
            // Hide console window
            var handle = GetConsoleWindow();
            ShowWindow(handle, SW_HIDE);

            // Check if already running
            bool createdNew;
            using (var mutex = new Mutex(true, "CafeClient_SingleInstance", out createdNew))
            {
                if (!createdNew)
                {
                    MessageBox.Show(
                        "Cafe Client is already running!",
                        "Cafe Client",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                    return;
                }

                Application.SetHighDpiMode(HighDpiMode.SystemAware);
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                // Run the main form which handles the tray icon
                Application.Run(new MainForm());
            }
        }
    }
}
