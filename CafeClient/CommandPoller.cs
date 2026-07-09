using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace CafeClient
{
    public class CommandPoller
    {
        private readonly ConfigManager _config;
        private readonly HttpClient _httpClient;
        private readonly CancellationTokenSource _cancellationToken;
        private Task? _pollerTask;

        public event EventHandler<string>? OnCommandReceived;

        public CommandPoller(ConfigManager config)
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
            _pollerTask?.Wait(TimeSpan.FromSeconds(5));
            _httpClient.Dispose();
        }

        private async Task PollLoop(CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                try
                {
                    var command = await PollCommandAsync();
                    if (command != "none" && !string.IsNullOrEmpty(command))
                        OnCommandReceived?.Invoke(this, command);
                }
                catch { }

                await Task.Delay(2000, token);
            }
        }

        private async Task<string> PollCommandAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync(
                    $"{_config.ServerUrl}/command?pc_id={_config.PCId}");

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var json = JObject.Parse(content);
                    return json["command"]?.ToString() ?? "none";
                }
            }
            catch { }

            return "none";
        }
    }
}
