import 'dart:async';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import '../database/database_helper.dart';
import 'app_logger.dart';

class SystemHealthService {
  static Future<void> runStartupChecks() async {
    FlutterError.onError = (details) {
      AppLogger.error('Flutter error', details.exception);
      if (kDebugMode) FlutterError.presentError(details);
    };

    PlatformDispatcher.instance.onError = (error, stack) {
      AppLogger.error('Uncaught error', error);
      return true;
    };

    try {
      await DatabaseHelper.instance.database;
      final audit = await DatabaseHelper.instance.runIntegrityAudit();
      AppLogger.info('Startup integrity: $audit');
    } catch (e) {
      AppLogger.error('Startup check failed', e);
    }
  }
}
