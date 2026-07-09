import 'package:flutter_test/flutter_test.dart';
import 'package:cyber_cafe_manager/database/database_helper.dart';
import 'package:cyber_cafe_manager/models/cafe_settings.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  group('DatabaseHelper', () {
    late DatabaseHelper dbHelper;

    setUp(() async {
      dbHelper = DatabaseHelper.instance;
      await dbHelper.close();
    });

    test('creates settings with api token on init', () async {
      final settings = await dbHelper.getSettings();
      expect(settings.cafeName, 'Cyber Cafe');
      expect(settings.apiToken.isNotEmpty, true);
      expect(settings.serverPort, 8080);
    });

    test('session end applies billing with offline grace', () async {
      final pcs = await dbHelper.getAllPCs();
      expect(pcs.isNotEmpty, true);

      final pcId = pcs.first['id'] as int;
      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      final sessionId = await dbHelper.createSession(pcId, now - 3600);

      final result = await dbHelper.endSession(
        sessionId: sessionId,
        endTime: now,
        rawDurationSeconds: 3600,
        offlineDurationSeconds: 400,
        hourlyRate: 20,
        settings: const CafeSettings(offlineGraceSeconds: 300),
      );

      expect(result.billableSeconds, 3700);
      expect(result.timeCost, closeTo(20.56, 0.1));
    });

    test('snack order links to active session', () async {
      final pcs = await dbHelper.getAllPCs();
      final pcId = pcs.first['id'] as int;
      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      final sessionId = await dbHelper.createSession(pcId, now);

      await dbHelper.addSnackOrder(pcId, 'Cola', 2, 10.0, sessionId: sessionId);
      final total = await dbHelper.getSnackTotalForSession(sessionId);
      expect(total, 20.0);
    });
  });
}
