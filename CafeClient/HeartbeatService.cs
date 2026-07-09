using System;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace CafeClient
{
    public class HeartbeatService
    {
        private readonly ConfigManager _config;
        private readonly HttpClient _httpClient;
        private readonly CancellationTokenSource _cancellationToken;
        private Task? _heartbeatTask;
        private DateTime _systemStartTime;
        private DateTime? _sessionStartTime;
        private int _offlineDurationSeconds;
        private int _retryDelayMs = 1000;
        private const int _maxRetryDelayMs = 30000;
        private bool _isRegistered;
        private double _hourlyRate;

        public event EventHandler<(bool connected, string message)>? OnStatusChanged;

        public HeartbeatService(ConfigManager config)
        {
            _config = config;
            _httpClient = ApiClient.CreateClient(config);
            _cancellationToken = new CancellationTokenSource();
            _systemStartTime = DateTime.Now;
        }

        public async Task StartAsync()
        {
            await RegisterAsync();
            _heartbeatTask = Task.Run(() => HeartbeatLoop(_cancellationToken.Token));
        }

        public void Stop()
        {
            _cancellationToken.Cancel();
            _heartbeatTask?.Wait(TimeSpan.FromSeconds(5));
            _httpClient.Dispose();
        }

        private async Task RegisterAsync()
        {
            try
            {
                var payload = new { pc_id = _config.PCId, name = $"PC-{_config.PCId}" };
                var json = JsonConvert.SerializeObject(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(
                    $"{_config.ServerUrl}/register", content);

                if (response.IsSuccessStatusCode)
                {
                    _isRegistered = true;
                    _retryDelayMs = 1000;
                    var body = await response.Content.ReadAsStringAsync();
                    var result = JsonConvert.DeserializeObject<dynamic>(body);
                    _hourlyRate = result?.hourly_rate ?? 0;
                    OnStatusChanged?.Invoke(this, (true, "Registered successfully"));
                }
                else
                {
                    OnStatusChanged?.Invoke(this, (false, "Registration failed - check API token"));
                    _Backoff();
                }
            }
            catch (Exception ex)
            {
                OnStatusChanged?.Invoke(this, (false, $"Reconnecting: {ex.Message}"));
                _Backoff();
            }
        }

        private void _Backoff()
        {
            _retryDelayMs = Math.Min(_retryDelayMs * 2, _maxRetryDelayMs);
        }

        private async Task HeartbeatLoop(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                try
                {
                    if (!_isRegistered) await RegisterAsync();
                    if (_isRegistered) await SendHeartbeatAsync();
                }
                catch (Exception ex)
                {
                    OnStatusChanged?.Invoke(this, (false, $"Reconnecting: {ex.Message}"));
                    _isRegistered = false;
                    _Backoff();
                }

                await Task.Delay(_isRegistered
                    ? _config.HeartbeatInterval * 1000
                    : _retryDelayMs, token);
            }
        }

        private async Task SendHeartbeatAsync()
        {
            var uptimeSeconds = (int)(DateTime.Now - _systemStartTime).TotalSeconds;
            int? sessionStart = _sessionStartTime.HasValue
                ? (int)(_sessionStartTime.Value.ToUniversalTime() -
                       new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalSeconds
                : null;

            string? thumbnailBase64 = null;
            if (_config.ThumbnailQuality > 0)
            {
                try
                {
                    thumbnailBase64 = ScreenCapture.CaptureThumbnailAsBase64(
                        quality: _config.ThumbnailQuality);
                }
                catch { }
            }

            var payload = new
            {
                pc_id = _config.PCId,
                uptime_seconds = uptimeSeconds,
                session_start = sessionStart,
                offline_duration = _offlineDurationSeconds,
                thumbnail = thumbnailBase64
            };

            var json = JsonConvert.SerializeObject(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.PostAsync(
                    $"{_config.ServerUrl}/heartbeat", content);

                if (response.IsSuccessStatusCode)
                {
                    _offlineDurationSeconds = 0;
                    OnStatusChanged?.Invoke(this, (true, GetTrayTooltip()));
                }
                else
                {
                    if (_sessionStartTime.HasValue)
                        _offlineDurationSeconds += _config.HeartbeatInterval;
                    OnStatusChanged?.Invoke(this, (false, "Server error"));
                    _isRegistered = false;
                }
            }
            catch
            {
                if (_sessionStartTime.HasValue)
                    _offlineDurationSeconds += _config.HeartbeatInterval;
                throw;
            }
        }

        public string GetTrayTooltip()
        {
            if (!_sessionStartTime.HasValue)
                return $"Cafe Client - PC {_config.PCId} (Ready)";

            var elapsed = DateTime.Now - _sessionStartTime.Value;
            var cost = _hourlyRate > 0
                ? (elapsed.TotalHours * (double)_hourlyRate).ToString("F1")
                : "?";
            return $"Session: {elapsed:hh\\:mm\\:ss} | {cost} EGP";
        }

        public void SetSessionActive(bool active, DateTime? startTime = null)
        {
            if (active)
                _sessionStartTime = startTime ?? DateTime.Now;
            else
            {
                _sessionStartTime = null;
                _offlineDurationSeconds = 0;
            }
        }
    }
}
