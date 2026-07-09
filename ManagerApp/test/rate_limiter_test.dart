import 'package:flutter_test/flutter_test.dart';
import 'package:cyber_cafe_manager/services/rate_limiter.dart';

void main() {
  test('rate limiter blocks after max requests', () {
    final limiter = RateLimiter(maxRequests: 3, window: const Duration(seconds: 60));
    expect(limiter.allow('pc1'), true);
    expect(limiter.allow('pc1'), true);
    expect(limiter.allow('pc1'), true);
    expect(limiter.allow('pc1'), false);
  });

  test('rate limiter is per-key', () {
    final limiter = RateLimiter(maxRequests: 1, window: const Duration(seconds: 60));
    expect(limiter.allow('a'), true);
    expect(limiter.allow('b'), true);
    expect(limiter.allow('a'), false);
  });
}
