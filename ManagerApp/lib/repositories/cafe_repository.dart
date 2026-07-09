import '../database/database_helper.dart';
import '../models/cafe_settings.dart';
import '../services/billing_service.dart';

/// Single entry point for business logic — keeps UI and HTTP layer decoupled.
class CafeRepository {
  static final CafeRepository instance = CafeRepository._();
  CafeRepository._();

  final _db = DatabaseHelper.instance;

  Future<CafeSettings> getSettings() => _db.getSettings();

  Future<List<Map<String, dynamic>>> getAllPCs() => _db.getAllPCs();

  Future<Map<String, dynamic>?> getPC(int id) => _db.getPC(id);

  Future<Map<String, dynamic>?> getActiveSession(int pcId) =>
      _db.getActiveSession(pcId);

  Future<SessionEndResult> endSession({
    required int sessionId,
    required int endTime,
    required int rawDurationSeconds,
    required int offlineDurationSeconds,
    required double hourlyRate,
    required CafeSettings settings,
  }) =>
      _db.endSession(
        sessionId: sessionId,
        endTime: endTime,
        rawDurationSeconds: rawDurationSeconds,
        offlineDurationSeconds: offlineDurationSeconds,
        hourlyRate: hourlyRate,
        settings: settings,
      );

  Future<int> createSession(int pcId, int startTime) =>
      _db.createSession(pcId, startTime);

  Future<Map<String, dynamic>> validateSnackOrder({
    required String snackName,
    required double clientPrice,
    required int quantity,
    required int pcId,
    required CafeSettings settings,
  }) async {
    if (quantity < 1 || quantity > 20) {
      return {'valid': false, 'error': 'Invalid quantity'};
    }

    final snack = await _db.getSnackByName(snackName);
    if (snack == null) {
      return {'valid': false, 'error': 'Snack not found'};
    }
    if ((snack['is_enabled'] as int? ?? 1) == 0) {
      return {'valid': false, 'error': 'Snack is disabled'};
    }

    final serverPrice = (snack['price'] as num).toDouble();
    if ((serverPrice - clientPrice).abs() > 0.01) {
      return {'valid': false, 'error': 'Price mismatch — refresh menu'};
    }

    if (settings.strictSnackOrders) {
      final session = await _db.getActiveSession(pcId);
      if (session == null) {
        return {'valid': false, 'error': 'No active session on this PC'};
      }
    }

    return {'valid': true, 'price': serverPrice};
  }

  Future<int> placeSnackOrder({
    required int pcId,
    required String snackName,
    required int quantity,
    required double price,
  }) =>
      _db.addSnackOrder(pcId, snackName, quantity, price);

  Future<void> savePendingCommand(int pcId, String command) =>
      _db.savePendingCommand(pcId, command);

  Future<String> peekPendingCommand(int pcId) =>
      _db.peekPendingCommand(pcId);

  Future<void> clearPendingCommand(int pcId) =>
      _db.clearPendingCommand(pcId);

  Future<Map<String, dynamic>> getServerHealth() async {
    final pcs = await _db.getAllPCs();
    final online = pcs.where((p) => (p['is_online'] as int? ?? 0) == 1).length;
    final stats = await _db.getTodayStatistics();
    return {
      'status': 'healthy',
      'timestamp': DateTime.now().toIso8601String(),
      'pcs_total': pcs.length,
      'pcs_online': online,
      'today_revenue': stats['total_revenue'],
      'pending_orders': (await _db.getPendingSnackOrders()).length,
    };
  }

  double calculateLiveCost(int durationSeconds, double hourlyRate) =>
      BillingService.calculateTimeCost(
        billableSeconds: durationSeconds,
        hourlyRate: hourlyRate,
        settings: const CafeSettings(billingRounding: 'none'),
      );
}
