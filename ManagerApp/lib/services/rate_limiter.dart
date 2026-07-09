/// Sliding-window rate limiter keyed by client identifier.
class RateLimiter {
  final int maxRequests;
  final Duration window;
  final Map<String, List<int>> _hits = {};

  RateLimiter({this.maxRequests = 30, this.window = const Duration(seconds: 60)});

  bool allow(String key) {
    final now = DateTime.now().millisecondsSinceEpoch;
    final cutoff = now - window.inMilliseconds;
    final list = _hits.putIfAbsent(key, () => []);
    list.removeWhere((t) => t < cutoff);
    if (list.length >= maxRequests) return false;
    list.add(now);
    return true;
  }

  void clear(String key) => _hits.remove(key);
}
