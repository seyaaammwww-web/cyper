using System;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

namespace CafeClient
{
    public class ConfigManager
    {
        private readonly string _configPath;
        private const string ConfigFileName = "config.ini";
        private const string RegistryRunKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
        private const string AppName = "CafeClient";

        public string ServerIP { get; private set; } = string.Empty;
        public int PCId { get; private set; } = 0;
        public string ApiToken { get; private set; } = string.Empty;
        public bool AutoStart { get; private set; } = true;
        public int ThumbnailQuality { get; private set; } = 50;
        public int HeartbeatInterval { get; private set; } = 5;
        public int ServerPort { get; private set; } = 8080;

        public ConfigManager()
        {
            _configPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "CafeClient",
                ConfigFileName
            );
            LoadConfig();
        }

        public string ServerUrl => $"http://{ServerIP}:{ServerPort}";

        private void LoadConfig()
        {
            try
            {
                if (!File.Exists(_configPath)) return;

                foreach (var line in File.ReadAllLines(_configPath))
                {
                    if (line.StartsWith('#') || !line.Contains('=')) continue;
                    var parts = line.Split('=', 2);
                    var key = parts[0].Trim().ToLower();
                    var value = parts[1].Trim();

                    switch (key)
                    {
                        case "server_ip":
                            ServerIP = value;
                            break;
                        case "pc_id":
                            if (int.TryParse(value, out int pcId)) PCId = pcId;
                            break;
                        case "api_token":
                            ApiToken = value;
                            break;
                        case "auto_start":
                            AutoStart = value.ToLower() == "true";
                            break;
                        case "thumbnail_quality":
                            if (int.TryParse(value, out int quality))
                                ThumbnailQuality = Math.Max(10, Math.Min(100, quality));
                            break;
                        case "heartbeat_interval":
                            if (int.TryParse(value, out int interval))
                                HeartbeatInterval = Math.Max(1, Math.Min(60, interval));
                            break;
                        case "server_port":
                            if (int.TryParse(value, out int port))
                                ServerPort = Math.Max(1024, Math.Min(65535, port));
                            break;
                    }
                }
            }
            catch
            {
                // Use defaults
            }
        }

        public void SaveConfig(
            string serverIP,
            int pcId,
            bool autoStart,
            int thumbnailQuality = 50,
            int heartbeatInterval = 5,
            string apiToken = "",
            int serverPort = 8080)
        {
            ServerIP = serverIP;
            PCId = pcId;
            AutoStart = autoStart;
            ThumbnailQuality = thumbnailQuality;
            HeartbeatInterval = heartbeatInterval;
            ApiToken = apiToken;
            ServerPort = serverPort;

            try
            {
                var directory = Path.GetDirectoryName(_configPath);
                if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                    Directory.CreateDirectory(directory);

                var content = $@"# Cafe Client Configuration
# Created: {DateTime.Now:yyyy-MM-dd HH:mm:ss}

server_ip={serverIP}
server_port={serverPort}
pc_id={pcId}
api_token={apiToken}
auto_start={autoStart.ToString().ToLower()}
thumbnail_quality={thumbnailQuality}
heartbeat_interval={heartbeatInterval}
";
                File.WriteAllText(_configPath, content);
                UpdateAutoStart(autoStart);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Failed to save configuration: {ex.Message}",
                    "Configuration Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        public void UpdateAutoStart(bool enable)
        {
            try
            {
                using var key = Registry.CurrentUser.OpenSubKey(RegistryRunKey, true);
                if (key == null) return;

                if (enable)
                {
                    var exePath = Application.ExecutablePath;
                    key.SetValue(AppName, $"\"{exePath}\"");
                }
                else if (key.GetValue(AppName) != null)
                {
                    key.DeleteValue(AppName);
                }
            }
            catch
            {
                // Ignore registry errors
            }
        }

        public bool IsConfigured() =>
            !string.IsNullOrEmpty(ServerIP) && PCId > 0;
    }
}
