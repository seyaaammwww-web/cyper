using System;
using System.Drawing;
using System.Windows.Forms;
using System.Threading.Tasks;

namespace CafeClient
{
    public partial class MainForm : Form
    {
        private NotifyIcon _notifyIcon = null!;
        private ContextMenuStrip _contextMenu = null!;
        private HeartbeatService? _heartbeatService;
        private CommandPoller? _commandPoller;
        private ControlPoller? _controlPoller;
        private ConfigManager _configManager = null!;
        private System.Windows.Forms.Timer? _tooltipTimer;
        private bool _isSessionActive;
        private DateTime? _sessionStartTime;
        private LockForm? _lockForm;

        public MainForm()
        {
            InitializeComponent();
            InitializeTrayIcon();
            InitializeServices();
            Load += MainForm_Load;
            FormClosing += MainForm_FormClosing;
        }

        private void InitializeComponent()
        {
            SuspendLayout();
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(0, 0);
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            StartPosition = FormStartPosition.Manual;
            Location = new Point(-32000, -32000);
            Opacity = 0;
            WindowState = FormWindowState.Minimized;
            ResumeLayout(false);
        }

        private void InitializeTrayIcon()
        {
            _contextMenu = new ContextMenuStrip();
            _contextMenu.Items.Add("Order Snack", null, OnOrderSnackClick);
            _contextMenu.Items.Add("-");
            var endSessionItem = new ToolStripMenuItem("End Session", null, OnEndSessionClick)
            {
                Name = "EndSessionItem",
                Visible = false
            };
            _contextMenu.Items.Add(endSessionItem);
            _contextMenu.Items.Add("-");
            _contextMenu.Items.Add("Settings", null, OnSettingsClick);
            _contextMenu.Items.Add("About", null, OnAboutClick);
            _contextMenu.Items.Add("-");
            _contextMenu.Items.Add("Exit", null, OnExitClick);

            _notifyIcon = new NotifyIcon
            {
                Icon = CreateIcon(),
                ContextMenuStrip = _contextMenu,
                Text = "Cafe Client",
                Visible = true
            };
            _notifyIcon.DoubleClick += OnNotifyIconDoubleClick;
        }

        // Icons are cached to avoid leaking GDI handles (GetHicon allocates
        // an unmanaged handle on every call, which would exhaust GDI objects
        // during 24/7 operation as status changes repeatedly).
        private Icon? _defaultIcon;
        private Icon? _connectedIcon;
        private Icon? _disconnectedIcon;
        private Icon? _activeSessionIcon;

        private Icon CreateIcon() =>
            _defaultIcon ??= CreateStatusIcon(Color.FromArgb(99, 102, 241));

        private Icon CreateConnectedIcon() =>
            _connectedIcon ??= CreateStatusIcon(Color.FromArgb(34, 197, 94));

        private Icon CreateDisconnectedIcon() =>
            _disconnectedIcon ??= CreateStatusIcon(Color.FromArgb(239, 68, 68));

        private Icon CreateActiveSessionIcon() =>
            _activeSessionIcon ??= CreateStatusIcon(Color.FromArgb(34, 197, 94), true);

        private Icon CreateStatusIcon(Color color, bool active = false)
        {
            using var bitmap = new Bitmap(32, 32);
            using var graphics = Graphics.FromImage(bitmap);
            graphics.Clear(Color.Transparent);
            using (var brush = new SolidBrush(color))
                graphics.FillRectangle(brush, 4, 4, 24, 18);
            using (var brush = new SolidBrush(Color.FromArgb(59, 130, 246)))
            {
                graphics.FillRectangle(brush, 8, 22, 16, 2);
                graphics.FillRectangle(brush, 12, 24, 8, 4);
            }
            if (active)
            {
                using var brush = new SolidBrush(Color.White);
                graphics.FillPolygon(brush, new[]
                {
                    new Point(14, 9), new Point(14, 18), new Point(22, 13)
                });
            }
            return Icon.FromHandle(bitmap.GetHicon());
        }

        private void InitializeServices() => _configManager = new ConfigManager();

        private async void MainForm_Load(object? sender, EventArgs e)
        {
            try
            {
                if (!_configManager.IsConfigured())
                {
                    ShowConfigurationDialog();
                    return;
                }
                await StartServicesAsync();
            }
            catch (Exception ex)
            {
                ShowBalloonTip("Error", $"Failed to start: {ex.Message}", ToolTipIcon.Error);
            }
        }

        private async Task StartServicesAsync()
        {
            // Stop any previously running services so re-configuring from
            // Settings never leaves duplicate heartbeat/poller loops running.
            StopServices();

            _heartbeatService = new HeartbeatService(_configManager);
            _heartbeatService.OnStatusChanged += OnHeartbeatStatusChanged;
            await _heartbeatService.StartAsync();

            _commandPoller = new CommandPoller(_configManager);
            _commandPoller.OnCommandReceived += OnCommandReceived;
            _commandPoller.Start();

            _controlPoller = new ControlPoller(_configManager);
            _controlPoller.OnControlReceived += OnControlReceived;
            _controlPoller.Start();

            _tooltipTimer = new System.Windows.Forms.Timer { Interval = 1000 };
            _tooltipTimer.Tick += (_, _) =>
            {
                if (_heartbeatService != null && _isSessionActive)
                    _notifyIcon.Text = _heartbeatService.GetTrayTooltip();
            };
            _tooltipTimer.Start();

            ShowBalloonTip("Connected", $"Connected as PC-{_configManager.PCId}", ToolTipIcon.Info);
        }

        private void StopServices()
        {
            _tooltipTimer?.Stop();
            _tooltipTimer?.Dispose();
            _tooltipTimer = null;

            if (_heartbeatService != null)
            {
                _heartbeatService.OnStatusChanged -= OnHeartbeatStatusChanged;
                _heartbeatService.Stop();
                _heartbeatService = null;
            }

            if (_commandPoller != null)
            {
                _commandPoller.OnCommandReceived -= OnCommandReceived;
                _commandPoller.Stop();
                _commandPoller = null;
            }

            if (_controlPoller != null)
            {
                _controlPoller.OnControlReceived -= OnControlReceived;
                _controlPoller.Stop();
                _controlPoller = null;
            }
        }

        private void OnHeartbeatStatusChanged(object? sender, (bool connected, string message) e)
        {
            _notifyIcon.Icon = e.connected
                ? (_isSessionActive ? CreateActiveSessionIcon() : CreateConnectedIcon())
                : CreateDisconnectedIcon();

            if (!e.connected)
                ShowBalloonTip("Disconnected", e.message, ToolTipIcon.Warning);
            else if (_isSessionActive && _heartbeatService != null)
                _notifyIcon.Text = _heartbeatService.GetTrayTooltip();
        }

        private void OnCommandReceived(object? sender, string command)
        {
            switch (command.ToLower())
            {
                case "start": StartSession(); break;
                case "stop": StopSession(); break;
            }
        }

        // Control commands arrive on a background polling thread; marshal every
        // action onto the UI thread before touching WinForms controls.
        private void OnControlReceived(object? sender, (string command, string? payload) e)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action(() => OnControlReceived(sender, e)));
                return;
            }

            switch (e.command.ToLower())
            {
                case "lock": LockScreen(); break;
                case "unlock": UnlockScreen(); break;
                case "shutdown": PowerController.Shutdown(); break;
                case "restart": PowerController.Restart(); break;
                case "sleep": PowerController.Sleep(); break;
                case "message": ShowRemoteMessage(e.payload); break;
            }
        }

        private void LockScreen()
        {
            if (_lockForm != null && !_lockForm.IsDisposed)
            {
                _lockForm.Show();
                _lockForm.BringToFront();
                _lockForm.Activate();
                return;
            }

            _lockForm = new LockForm($"PC-{_configManager.PCId}");
            _lockForm.FormClosed += (_, _) => _lockForm = null;
            _lockForm.Show();
            _lockForm.BringToFront();
            _lockForm.Activate();
        }

        private void UnlockScreen()
        {
            if (_lockForm != null && !_lockForm.IsDisposed)
            {
                _lockForm.AllowClose();
                _lockForm.Close();
                _lockForm = null;
            }
        }

        private void ShowRemoteMessage(string? message)
        {
            if (string.IsNullOrWhiteSpace(message)) return;

            // If the machine is locked, surface the message on the lock screen;
            // otherwise show a balloon so the customer sees it in-session.
            if (_lockForm != null && !_lockForm.IsDisposed)
            {
                _lockForm.SetMessage(message);
            }
            else
            {
                ShowBalloonTip("Message from front desk", message, ToolTipIcon.Info);
            }
        }

        private void StartSession()
        {
            _isSessionActive = true;
            _sessionStartTime = DateTime.Now;
            _heartbeatService?.SetSessionActive(true, _sessionStartTime);
            ShowBalloonTip("Session Started", "Your session has started. Enjoy!", ToolTipIcon.Info);
            _notifyIcon.Icon = CreateActiveSessionIcon();
            SetEndSessionVisible(true);
        }

        private void StopSession()
        {
            _isSessionActive = false;
            _heartbeatService?.SetSessionActive(false);
            var duration = _sessionStartTime.HasValue
                ? (DateTime.Now - _sessionStartTime.Value).ToString(@"hh\:mm\:ss")
                : "Unknown";
            _sessionStartTime = null;
            ShowBalloonTip("Session Ended", $"Session duration: {duration}", ToolTipIcon.Info);
            _notifyIcon.Icon = CreateConnectedIcon();
            _notifyIcon.Text = $"Cafe Client - PC {_configManager.PCId}";
            SetEndSessionVisible(false);
        }

        private void SetEndSessionVisible(bool visible)
        {
            var items = _contextMenu.Items.Find("EndSessionItem", false);
            if (items.Length > 0) items[0].Visible = visible;
        }

        private void ShowConfigurationDialog()
        {
            using var form = new ConfigurationForm(_configManager);
            if (form.ShowDialog() == DialogResult.OK)
                _ = StartServicesAsync();
            else
                Application.Exit();
        }

        private async void OnEndSessionClick(object? sender, EventArgs e)
        {
            if (MessageBox.Show("End your session?", "End Session",
                    MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                return;

            try
            {
                using var client = ApiClient.CreateClient(_configManager);
                var payload = new { pc_id = _configManager.PCId };
                var json = Newtonsoft.Json.JsonConvert.SerializeObject(payload);
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
                var response = await client.PostAsync(
                    $"{_configManager.ServerUrl}/end_session", content);

                if (response.IsSuccessStatusCode) StopSession();
                else
                    MessageBox.Show("Failed to end session. Contact staff.", "Error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error: {ex.Message}", "Error",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void OnOrderSnackClick(object? sender, EventArgs e)
        {
            using var form = new SnackOrderForm(_configManager);
            form.ShowDialog();
        }

        private void OnSettingsClick(object? sender, EventArgs e) => ShowConfigurationDialog();

        private void OnAboutClick(object? sender, EventArgs e)
        {
            MessageBox.Show(
                "Cyber Cafe Client v1.0.0\n\nSession monitoring and snack ordering.",
                "About", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private void OnExitClick(object? sender, EventArgs e)
        {
            if (MessageBox.Show("Exit Cafe Client?", "Confirm",
                    MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
                Application.Exit();
        }

        private void OnNotifyIconDoubleClick(object? sender, EventArgs e) =>
            OnOrderSnackClick(sender, e);

        private void ShowBalloonTip(string title, string text, ToolTipIcon icon) =>
            _notifyIcon.ShowBalloonTip(3000, title, text, icon);

        private void MainForm_FormClosing(object? sender, FormClosingEventArgs e)
        {
            StopServices();
            if (_lockForm != null && !_lockForm.IsDisposed)
            {
                _lockForm.AllowClose();
                _lockForm.Close();
                _lockForm = null;
            }
            _notifyIcon.Visible = false;
            _notifyIcon.Dispose();
            _defaultIcon?.Dispose();
            _connectedIcon?.Dispose();
            _disconnectedIcon?.Dispose();
            _activeSessionIcon?.Dispose();
        }
    }
}
