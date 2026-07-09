import 'package:flutter_test/flutter_test.dart';
import 'package:cyber_cafe_manager/database/database_helper.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  group('Integrity', () {
    test('repair fixes stale online PCs', () async {
      final db = DatabaseHelper.instance;
      await db.close();

      final audit = await db.runIntegrityAudit();
      expect(audit['healthy'], isTrue);
    });

    test('cannot create duplicate active sessions', () async {
      final db = DatabaseHelper.instance;
      final pcs = await db.getAllPCs();
      final pcId = pcs.first['id'] as int;
      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;

      await db.createSession(pcId, now);
      expect(await db.hasActiveSession(pcId), isTrue);

      await db.createSession(pcId, now + 10);
      final active = await db.getActiveSession(pcId);
      expect(active, isNotNull);
    });

    test('peek command persists until cleared', () async {
      final db = DatabaseHelper.instance;
      final pcs = await db.getAllPCs();
      final pcId = pcs.first['id'] as int;

      await db.savePendingCommand(pcId, 'start');
      expect(await db.peekPendingCommand(pcId), 'start');
      expect(await db.peekPendingCommand(pcId), 'start');
      await db.clearPendingCommand(pcId);
      expect(await db.peekPendingCommand(pcId), 'none');
    });
  });
}
