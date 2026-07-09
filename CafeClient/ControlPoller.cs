using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace CafeClient
{
    /// <summary>
    /// Polls the manager's /control endpoint for transient remote-control
    /// commands (lock / unlock / shutdown / restart / sleep / message).
    /// These are separate from CommandPoller's session start/stop flags:
    /// control commands are a FIFO queue consumed on delivery, so each is
    /// executed exactly once.
    /// </summary>
    public class ControlPoller
    {
        private readonly ConfigManager _config;
        private readonly HttpClient _httpClient;
        private readonly CancellationTokenSource _cancellationToken;
        private Task? _pollerTask;

        public event EventHandler<(string command, string? payload)>? OnControlReceived;

        public ControlPoller(ConfigManager config)
        {
            _config = config;
            _httpClient = ApiClient.CreateClient(config);
            _cancellationToken = new CancellationTokenSource();
        }

        public void Start()
        {
            _pollerTask = Task.Run(() => PollLoop(_cancellationToken.Token));
        }

        public void Stop()
        {
            _cancellationToken.Cancel();
            try
            {
                _pollerTask?.Wait(TimeSpan.FromSeconds(5));
            }
            catch (AggregateException)
            {
                // Expected: task cancelled during shutdown
            }
            _httpClient.Dispose();
        }

        private async Task PollLoop(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                try
                {
                    var (command, payload) = await PollControlAsync();
                    if (command != "none" && !string.IsNullOrEmpty(command))
                        OnControlReceived?.Invoke(this, (command, payload));
                }
                catch { }

                await Task.Delay(1500, token);
            }
        }

        private async Task<(string command, string? payload)> PollControlAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync(
                    $"{_config.ServerUrl}/control?pc_id={_config.PCId}");

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var json = JObject.Parse(content);
                    var command = json["command"]?.ToString() ?? "none";
                    var payload = json["payload"]?.ToString();
                    return (command, payload);
                }
            }
            catch { }

            return ("none", null);
        }
    }
}
