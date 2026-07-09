using System;
using System.Collections.Generic;
using System.Drawing;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace CafeClient
{
    public class SnackOrderForm : Form
    {
        private readonly ConfigManager _configManager;
        private readonly HttpClient _httpClient;
        private List<SnackItem> _snacks = new();
        private FlowLayoutPanel _snacksPanel = null!;
        private Label _statusLabel = null!;

        public SnackOrderForm(ConfigManager configManager)
        {
            _configManager = configManager;
            _httpClient = ApiClient.CreateClient(configManager);
            
            InitializeComponent();
            _ = LoadSnacksAsync();
        }

        private void InitializeComponent()
        {
            this.Text = "Order Snack";
            this.Size = new Size(400, 500);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(30, 30, 40);

            // Title
            var titleLabel = new Label
            {
                Text = "🍿 Order a Snack",
                Font = new Font("Segoe UI", 16, FontStyle.Bold),
                ForeColor = Color.White,
                AutoSize = true,
                Location = new Point(20, 20)
            };
            this.Controls.Add(titleLabel);

            // Status label
            _statusLabel = new Label
            {
                Text = "Loading snacks...",
                ForeColor = Color.FromArgb(150, 150, 150),
                AutoSize = true,
                Location = new Point(20, 60)
            };
            this.Controls.Add(_statusLabel);

            // Refresh button
            var refreshButton = new Button
            {
                Text = "🔄 Refresh",
                Size = new Size(100, 30),
                Location = new Point(260, 55),
                BackColor = Color.FromArgb(50, 50, 60),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9)
            };
            refreshButton.Click += (s, e) => _ = LoadSnacksAsync();
            this.Controls.Add(refreshButton);

            // Snacks panel
            _snacksPanel = new FlowLayoutPanel
            {
                Location = new Point(20, 90),
                Size = new Size(340, 330),
                BackColor = Color.FromArgb(40, 40, 50),
                AutoScroll = true,
                FlowDirection = FlowDirection.LeftToRight,
                WrapContents = true,
                Padding = new Padding(10)
            };
            this.Controls.Add(_snacksPanel);

            // Close button
            var closeButton = new Button
            {
                Text = "Close",
                Size = new Size(100, 35),
                Location = new Point(270, 430),
                BackColor = Color.FromArgb(60, 60, 70),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            closeButton.Click += (s, e) => this.Close();
            this.Controls.Add(closeButton);
        }

        private async Task LoadSnacksAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_configManager.ServerUrl}/snacks");

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var json = JObject.Parse(content);
                    var snacksArray = json["snacks"] as JArray;

                    if (snacksArray != null)
                    {
                        _snacks.Clear();
                        foreach (var snack in snacksArray)
                        {
                            _snacks.Add(new SnackItem
                            {
                                Name = snack["name"]?.ToString() ?? "",
                                Price = (double)(snack["price"] ?? 0)
                            });
                        }

                        PopulateSnacks();
                        _statusLabel.Text = $"Found {_snacks.Count} snacks";
                        _statusLabel.ForeColor = Color.FromArgb(100, 200, 100);
                    }
                }
                else
                {
                    _statusLabel.Text = "Failed to load snacks";
                    _statusLabel.ForeColor = Color.Red;
                }
            }
            catch (Exception ex)
            {
                _statusLabel.Text = $"Error: {ex.Message}";
                _statusLabel.ForeColor = Color.Red;
            }
        }

        private void PopulateSnacks()
        {
            _snacksPanel.Controls.Clear();

            foreach (var snack in _snacks)
            {
                var snackCard = CreateSnackCard(snack);
                _snacksPanel.Controls.Add(snackCard);
            }
        }

        private Panel CreateSnackCard(SnackItem snack)
        {
            var panel = new Panel
            {
                Size = new Size(145, 120),
                BackColor = Color.FromArgb(50, 50, 60),
                Margin = new Padding(5),
                Cursor = Cursors.Hand
            };

            // Icon
            var iconLabel = new Label
            {
                Text = GetSnackEmoji(snack.Name),
                Font = new Font("Segoe UI", 24),
                AutoSize = false,
                Size = new Size(40, 40),
                Location = new Point(10, 10),
                TextAlign = ContentAlignment.MiddleCenter,
                BackColor = Color.Transparent,
                ForeColor = Color.White
            };
            panel.Controls.Add(iconLabel);

            // Name
            var nameLabel = new Label
            {
                Text = snack.Name,
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                ForeColor = Color.White,
                AutoSize = true,
                Location = new Point(55, 15)
            };
            panel.Controls.Add(nameLabel);

            // Price
            var priceLabel = new Label
            {
                Text = $"{snack.Price:F0} EGP",
                Font = new Font("Segoe UI", 10),
                ForeColor = Color.FromArgb(99, 102, 241),
                AutoSize = true,
                Location = new Point(55, 35)
            };
            panel.Controls.Add(priceLabel);

            // Quantity selection
            var qtyLabel = new Label
            {
                Text = "Qty:",
                ForeColor = Color.Gray,
                Font = new Font("Segoe UI", 8),
                Location = new Point(10, 65),
                AutoSize = true
            };
            panel.Controls.Add(qtyLabel);

            var qtyNum = new NumericUpDown
            {
                Location = new Point(45, 62),
                Size = new Size(40, 20),
                Minimum = 1,
                Maximum = 10,
                Value = 1,
                BackColor = Color.FromArgb(40, 40, 50),
                ForeColor = Color.White,
                BorderStyle = BorderStyle.None
            };
            panel.Controls.Add(qtyNum);

            var totalLabel = new Label
            {
                Text = $"{snack.Price:F0} EGP",
                TextAlign = ContentAlignment.MiddleRight,
                ForeColor = Color.FromArgb(150, 150, 150),
                Font = new Font("Segoe UI", 8),
                Location = new Point(85, 65),
                Size = new Size(50, 20)
            };
            panel.Controls.Add(totalLabel);

            qtyNum.ValueChanged += (s, e) => {
                totalLabel.Text = $"{(double)qtyNum.Value * snack.Price:F0} EGP";
            };

            // Order button
            var orderButton = new Button
            {
                Text = "Order",
                Size = new Size(125, 25),
                Location = new Point(10, 88),
                BackColor = Color.FromArgb(99, 102, 241),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Tag = new OrderTag { Snack = snack, Qty = qtyNum }
            };
            orderButton.Click += OnOrderClick;
            panel.Controls.Add(orderButton);

            // Hover effect
            panel.MouseEnter += (s, e) => 
            {
                panel.BackColor = Color.FromArgb(60, 60, 70);
            };
            panel.MouseLeave += (s, e) => 
            {
                panel.BackColor = Color.FromArgb(50, 50, 60);
            };

            return panel;
        }

        private string GetSnackEmoji(string snackName)
        {
            return snackName.ToLower() switch
            {
                "cola" => "🥤",
                "chips" => "🍟",
                "coffee" => "☕",
                "water" => "💧",
                "chocolate" => "🍫",
                "tea" => "🍵",
                "juice" => "🧃",
                "sandwich" => "🥪",
                _ => "🍿"
            };
        }

        private async void OnOrderClick(object? sender, EventArgs e)
        {
            if (sender is Button button && button.Tag is OrderTag tag)
            {
                SnackItem snack = tag.Snack;
                NumericUpDown qtyNum = tag.Qty;
                int quantity = (int)qtyNum.Value;

                button.Enabled = false;
                button.Text = "Ordering...";

                try
                {
                    var success = await OrderSnackAsync(snack, quantity);
                    
                    if (success)
                    {
                        MessageBox.Show(
                            $"{snack.Name} ordered successfully!\nA staff member will bring it to you shortly.",
                            "Order Placed",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Information
                        );
                        this.Close();
                    }
                    else
                    {
                        MessageBox.Show(
                            "Failed to place order. Please try again.",
                            "Order Failed",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error
                        );
                        button.Enabled = true;
                        button.Text = "Order";
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show(
                        $"Error: {ex.Message}",
                        "Order Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    button.Enabled = true;
                    button.Text = "Order";
                }
            }
        }

        private async Task<bool> OrderSnackAsync(SnackItem snack, int quantity)
        {
            try
            {
                var serverUrl = _configManager.ServerUrl;
                
                var payload = new
                {
                    pc_id = _configManager.PCId,
                    snack = snack.Name,
                    quantity = quantity,
                    price = snack.Price
                };

                var json = JsonConvert.SerializeObject(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync($"{serverUrl}/order", content);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _httpClient.Dispose();
            }
            base.Dispose(disposing);
        }
        private class OrderTag
        {
            public SnackItem Snack { get; set; } = null!;
            public NumericUpDown Qty { get; set; } = null!;
        }
    }

    public class SnackItem
    {
        public string Name { get; set; } = string.Empty;
        public double Price { get; set; }
    }
}
