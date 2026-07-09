using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

namespace CafeClient
{
    public class HttpServer : IDisposable
    {
        private readonly HttpListener _listener;
        private readonly int _port;
        private CancellationTokenSource? _cancellationToken;
        private bool _isRunning;

        public event EventHandler<HttpListenerContext>? OnRequestReceived;

        public int Port => _port;
        public bool IsRunning => _isRunning;

        public HttpServer(int port = 8081)
        {
            _port = port;
            _listener = new HttpListener();
            _listener.Prefixes.Add($"http://+:{_port}/");
        }

        public void Start()
        {
            if (_isRunning) return;

            try
            {
                _listener.Start();
                _cancellationToken = new CancellationTokenSource();
                _isRunning = true;

                Task.Run(() => ListenLoop(_cancellationToken.Token));
            }
            catch (HttpListenerException ex)
            {
                throw new InvalidOperationException($"Failed to start HTTP server on port {_port}: {ex.Message}");
            }
        }

        public void Stop()
        {
            if (!_isRunning) return;

            _cancellationToken?.Cancel();
            _listener.Stop();
            _isRunning = false;
        }

        private async Task ListenLoop(CancellationToken token)
        {
            while (!token.IsCancellationRequested && _isRunning)
            {
                try
                {
                    var context = await _listener.GetContextAsync();
                    
                    if (!token.IsCancellationRequested)
                    {
                        OnRequestReceived?.Invoke(this, context);
                    }
                }
                catch (HttpListenerException)
                {
                    // Listener stopped
                    break;
                }
                catch (Exception)
                {
                    // Ignore other errors
                }
            }
        }

        public static void SendResponse(HttpListenerResponse response, byte[] content, string contentType = "application/json", int statusCode = 200)
        {
            response.StatusCode = statusCode;
            response.ContentType = contentType;
            response.ContentLength64 = content.Length;
            
            using (var stream = response.OutputStream)
            {
                stream.Write(content, 0, content.Length);
            }
        }

        public static void SendJsonResponse(HttpListenerResponse response, string json, int statusCode = 200)
        {
            var content = System.Text.Encoding.UTF8.GetBytes(json);
            SendResponse(response, content, "application/json", statusCode);
        }

        public static void SendImageResponse(HttpListenerResponse response, byte[] imageData)
        {
            SendResponse(response, imageData, "image/jpeg");
        }

        public static void SendErrorResponse(HttpListenerResponse response, string message, int statusCode = 400)
        {
            var json = $"{{\"error\": \"{message}\"}}";
            SendJsonResponse(response, json, statusCode);
        }

        public void Dispose()
        {
            Stop();
            _listener.Close();
            _cancellationToken?.Dispose();
        }
    }
}
