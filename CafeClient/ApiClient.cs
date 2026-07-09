using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace CafeClient
{
    public static class ApiClient
    {
        public static HttpClient CreateClient(ConfigManager config)
        {
            var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            if (!string.IsNullOrEmpty(config.ApiToken))
            {
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", config.ApiToken);
            }
            return client;
        }

        public static async Task<JArray?> FetchPCsAsync(string serverUrl, string apiToken)
        {
            try
            {
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
                if (!string.IsNullOrEmpty(apiToken))
                {
                    client.DefaultRequestHeaders.Authorization =
                        new AuthenticationHeaderValue("Bearer", apiToken);
                }
                var response = await client.GetAsync($"{serverUrl}/pcs");
                if (!response.IsSuccessStatusCode) return null;

                var content = await response.Content.ReadAsStringAsync();
                var json = JObject.Parse(content);
                return json["pcs"] as JArray;
            }
            catch
            {
                return null;
            }
        }

        public static async Task<JArray?> FetchPCsAsync(ConfigManager config) =>
            await FetchPCsAsync(config.ServerUrl, config.ApiToken);
    }
}
