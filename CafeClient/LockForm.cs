using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace CafeClient
{
    /// <summary>
    /// A fullscreen, always-on-top overlay that blocks all use of the PC until
    /// the owner starts a paid session (which sends an "unlock" command).
    /// It covers every monitor, disables Alt+F4, and hides itself from the
    /// taskbar / Alt+Tab so a customer cannot bypass it casually.
    /// </summary>
    public class LockForm : Form
    {
        private readonly Label _titleLabel;
        private readonly Label _subtitleLabel;
        private readonly Label _messageLabel;

        // Prevent the window from being closed by Alt+F4 / task manager "End task"
        private const int CP_NOCLOSE_BUTTON = 0x200;

        public LockForm(string cafeName)
        {
            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Maximized;
            TopMost = true;
            ShowInTaskbar = false;
            StartPosition = FormStartPosition.Manual;
            BackColor = Color.FromArgb(15, 17, 26);
            KeyPreview = true;
            ControlBox = false;
            Cursor = Cursors.No;

            // Span all monitors so the lock cannot be sidestepped on multi-monitor rigs.
            var bounds = SystemInformation.VirtualScreen;
            Bounds = bounds;

            var container = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = Color.FromArgb(15, 17, 26),
            };

            _titleLabel = new Label
            {
                Text = string.IsNullOrWhiteSpace(cafeName) ? "Locked" : cafeName,
                ForeColor = Color.FromArgb(129, 140, 248),
                Font = new Font("Segoe UI", 42F, FontStyle.Bold),
                AutoSize = false,
                TextAlign = ContentAlignment.MiddleCenter,
                Dock = DockStyle.Top,
                Height = 120,
            };

            _subtitleLabel = new Label
            {
                Text = "This computer is locked.\nPlease see the front desk to start your session.",
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 20F, FontStyle.Regular),
                AutoSize = false,
                TextAlign = ContentAlignment.MiddleCenter,
                Dock = DockStyle.Top,
                Height = 120,
            };

            _messageLabel = new Label
            {
                Text = string.Empty,
                ForeColor = Color.FromArgb(250, 204, 21),
                Font = new Font("Segoe UI", 16F, FontStyle.Italic),
                AutoSize = false,
                TextAlign = ContentAlignment.MiddleCenter,
                Dock = DockStyle.Top,
                Height = 80,
                Visible = false,
            };

            container.Controls.Add(_messageLabel);
            container.Controls.Add(_subtitleLabel);
            container.Controls.Add(_titleLabel);
            Controls.Add(container);

            FormClosing += LockForm_FormClosing;
            Load += (s, e) => { BringToFront(); Activate(); };
        }

        protected override CreateParams CreateParams
        {
            get
            {
                var cp = base.CreateParams;
                cp.ClassStyle |= CP_NOCLOSE_BUTTON;
                cp.ExStyle |= 0x80; // WS_EX_TOOLWINDOW: hide from Alt+Tab
                return cp;
            }
        }

        private bool _allowClose;

        public void AllowClose()
        {
            _allowClose = true;
        }

        private void LockForm_FormClosing(object? sender, FormClosingEventArgs e)
        {
            // Block user-initiated closes (Alt+F4, task manager). Only the
            // unlock command (which calls AllowClose first) may close it.
            if (!_allowClose && e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
            }
        }

        /// <summary>Show an owner-sent message on the lock screen.</summary>
        public void SetMessage(string? message)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action(() => SetMessage(message)));
                return;
            }
            if (string.IsNullOrWhiteSpace(message))
            {
                _messageLabel.Visible = false;
                _messageLabel.Text = string.Empty;
            }
            else
            {
                _messageLabel.Text = message;
                _messageLabel.Visible = true;
            }
        }
    }
}
