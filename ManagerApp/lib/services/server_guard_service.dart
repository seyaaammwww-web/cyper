import 'dart:async';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../database/database_helper.dart';
import 'http_server_service.dart';
import 'app_logger.dart';

/// Keeps the cafe server alive and auto-recovers from failures.
class ServerGuardService {
  static final ServerGuardService instance = ServerGuardService._();
  ServerGuardService._();

  Timer? _watchdog;
  String? _lastIp;
  int _lastPort = 8080;
  int _consecutiveFailures = 0;

  void start({required String ip, required int port}) {
    _lastIp = ip;
    _lastPort = port;
    WakelockPlus.enable();
    _watchdog?.cancel();
    _watchdog = Timer.periodic(const Duration(seconds: 30), (_) => _healthCheck());
    AppLogger.info('Server guard active on $ip:$port');
  }

  Future<void> stop() async {
    _watchdog?.cancel();
    _watchdog = null;
    await WakelockPlus.disable();
  }

  Future<void> _healthCheck() async {
    if (!HttpServerService.instance.isRunning && _lastIp != null) {
      _consecutiveFailures++;
      AppLogger.warn('Server down — restart attempt $_consecutiveFailures');
      try {
        await HttpServerService.instance.startServer(_lastIp!, port: _lastPort);
        _consecutiveFailures = 0;
        AppLogger.info('Server auto-restarted');
      } catch (e) {
        AppLogger.error('Auto-restart failed', e);
      }
    } else {
      _consecutiveFailures = 0;
    }
  }

  Future<Map<String, dynamic>> fullSystemCheck() async {
    final audit = await DatabaseHelper.instance.runIntegrityAudit();
    return {
      'server_running': HttpServerService.instance.isRunning,
      'server_address': HttpServerService.instance.isRunning
          ? HttpServerService.instance.serverAddress
          : null,
      'consecutive_failures': _consecutiveFailures,
      'database': audit,
      'timestamp': DateTime.now().toIso8601String(),
    };
  }
}
