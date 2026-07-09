using System;
using System.Drawing;
using System.Windows.Forms;
using Newtonsoft.Json.Linq;

namespace CafeClient
{
    public class ConfigurationForm : Form
    {
        private readonly ConfigManager _configManager;
        private TextBox _serverIPTextBox = null!;
        private ComboBox _pcIdComboBox = null!;
        private TextBox _tokenTextBox = null!;
        private NumericUpDown _portNumeric = null!;
        private CheckBox _autoStartCheckBox = null!;
        private TrackBar _qualityTrackBar = null!;
        private NumericUpDown _intervalNumeric = null!;
        private Button _fetchButton = null!;

        public ConfigurationForm(ConfigManager configManager)
        {
            _configManager = configManager;
            InitializeComponent();
            LoadCurrentConfig();
        }

        private void InitializeComponent()
        {
            Text = "Cafe Client Configuration";
            ClientSize = new Size(420, 560);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(30, 30, 40);

            var titleLabel = new Label
            {
                Text = "Configuration",
                Font = new Font("Segoe UI", 18, FontStyle.Bold),
                ForeColor = Color.White,
                AutoSize = true,
                Location = new Point(20, 20)
            };
            Controls.Add(titleLabel);

            Controls.Add(MakeLabel("Server IP:", 70));
            _serverIPTextBox = new TextBox
            {
                Location = new Point(20, 95),
                Size = new Size(260, 30),
                BackColor = Color.FromArgb(50, 50, 60),
                ForeColor = Color.White
            };
            Controls.Add(_serverIPTextBox);

            _fetchButton = new Button
            {
                Text = "Fetch PCs",
                Location = new Point(290, 93),
                Size = new Size(100, 30),
                BackColor = Color.FromArgb(99, 102, 241),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            _fetchButton.Click += async (_, _) => await FetchPCsAsync();
            Controls.Add(_fetchButton);

            Controls.Add(MakeLabel("Server Port:", 135));
            _portNumeric = new NumericUpDown
            {
                Location = new Point(20, 160),
                Size = new Size(100, 30),
                Minimum = 1024,
                Maximum = 65535,
                Value = 8080,
                BackColor = Color.FromArgb(50, 50, 60),
                ForeColor = Color.White
            };
            Controls.Add(_portNumeric);

            Controls.Add(MakeLabel("PC:", 200));
            _pcIdComboBox = new ComboBox
            {
                Location = new Point(20, 225),
                Size = new Size(370, 30),
                BackColor = Color.FromArgb(50, 50, 60),
                ForeColor = Color.White,
                DropDownStyle = ComboBoxStyle.DropDownList
            };
            Controls.Add(_pcIdComboBox);

            Controls.Add(MakeLabel("API Token:", 265));
            _tokenTextBox = new TextBox
            {
                Location = new Point(20, 290),
                Size = new Size(370, 30),
                BackColor = Color.FromArgb(50, 50, 60),
                ForeColor = Color.White
            };
            Controls.Add(_tokenTextBox);

            _autoStartCheckBox = new CheckBox
            {
                Text = "Start automatically with Windows",
                ForeColor = Color.FromArgb(200, 200, 200),
                Location = new Point(20, 330),
                AutoSize = true,
                Checked = true
            };
            Controls.Add(_autoStartCheckBox);

            Controls.Add(MakeLabel("Thumbnail Quality:", 360));
            _qualityTrackBar = new TrackBar
            {
                Location = new Point(20, 380),
                Size = new Size(370, 45),
                Minimum = 0,
                Maximum = 100,
                Value = 50
            };
            Controls.Add(_qualityTrackBar);

            Controls.Add(MakeLabel("Heartbeat Interval (s):", 430));
            _intervalNumeric = new NumericUpDown
            {
                Location = new Point(20, 455),
                Size = new Size(100, 30),
                Minimum = 1,
                Maximum = 60,
                Value = 5,
                BackColor = Color.FromArgb(50, 50, 60),
                ForeColor = Color.White
            };
            Controls.Add(_intervalNumeric);

            var saveButton = new Button
            {
                Text = "Save",
                Size = new Size(100, 35),
                Location = new Point(180, 510),
                BackColor = Color.FromArgb(99, 102, 241),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            saveButton.Click += OnSaveClick;
            Controls.Add(saveButton);

            var cancelButton = new Button
            {
                Text = "Cancel",
                Size = new Size(100, 35),
                Location = new Point(290, 510),
                BackColor = Color.FromArgb(60, 60, 70),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            cancelButton.Click += (_, _) => { DialogResult = DialogResult.Cancel; Close(); };
            Controls.Add(cancelButton);
        }

        private Label MakeLabel(string text, int y) => new()
        {
            Text = text,
            ForeColor = Color.FromArgb(200, 200, 200),
            Location = new Point(20, y),
            AutoSize = true
        };

        private void LoadCurrentConfig()
        {
            if (!string.IsNullOrEmpty(_configManager.ServerIP))
                _serverIPTextBox.Text = _configManager.ServerIP;
            _portNumeric.Value = _configManager.ServerPort;
            _tokenTextBox.Text = _configManager.ApiToken;
            _autoStartCheckBox.Checked = _configManager.AutoStart;
            _qualityTrackBar.Value = _configManager.ThumbnailQuality;
            _intervalNumeric.Value = _configManager.HeartbeatInterval;

            PopulatePCFallback();
            if (_configManager.PCId > 0)
            {
                for (int i = 0; i < _pcIdComboBox.Items.Count; i++)
                {
                    if (_pcIdComboBox.Items[i] is PCItem item && item.Id == _configManager.PCId)
                    {
                        _pcIdComboBox.SelectedIndex = i;
                        break;
                    }
                }
            }
        }

        private void PopulatePCFallback()
        {
            _pcIdComboBox.Items.Clear();
            for (int i = 1; i <= 20; i++)
                _pcIdComboBox.Items.Add(new PCItem(i, $"PC {i}", "Unknown"));
            if (_pcIdComboBox.Items.Count > 0)
                _pcIdComboBox.SelectedIndex = 0;
        }

        private async System.Threading.Tasks.Task FetchPCsAsync()
        {
            _fetchButton.Enabled = false;
            _fetchButton.Text = "...";

            var serverUrl = $"http://{_serverIPTextBox.Text.Trim()}:{(int)_portNumeric.Value}";
            var pcs = await ApiClient.FetchPCsAsync(serverUrl, _tokenTextBox.Text.Trim());
            _pcIdComboBox.Items.Clear();

            if (pcs != null && pcs.Count > 0)
            {
                foreach (var pc in pcs)
                {
                    var id = (int)(pc["id"] ?? 0);
                    var name = pc["name"]?.ToString() ?? $"PC-{id}";
                    var type = pc["type"]?.ToString() ?? "";
                    _pcIdComboBox.Items.Add(new PCItem(id, name, type));
                }
                _pcIdComboBox.SelectedIndex = 0;
            }
            else
            {
                PopulatePCFallback();
                MessageBox.Show(
                    "Could not fetch PCs. Check IP, port, and API token.\nUsing fallback list.",
                    "Fetch Failed", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }

            _fetchButton.Enabled = true;
            _fetchButton.Text = "Fetch PCs";
        }

        private void OnSaveClick(object? sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(_serverIPTextBox.Text))
            {
                MessageBox.Show("Enter server IP.", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            if (_pcIdComboBox.SelectedItem is not PCItem selected)
            {
                MessageBox.Show("Select a PC.", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            _configManager.SaveConfig(
                _serverIPTextBox.Text.Trim(),
                selected.Id,
                _autoStartCheckBox.Checked,
                _qualityTrackBar.Value,
                (int)_intervalNumeric.Value,
                _tokenTextBox.Text.Trim(),
                (int)_portNumeric.Value
            );

            DialogResult = DialogResult.OK;
            Close();
        }

        private class PCItem
        {
            public int Id { get; }
            public string Name { get; }
            public PCItem(int id, string name, string type)
            {
                Id = id;
                Name = $"{id} - {name} ({type})";
            }
            public override string ToString() => Name;
        }
    }
}
