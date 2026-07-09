import 'dart:math';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/cafe_settings.dart';
import '../services/app_logger.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;
  static const int _dbVersion = 6;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('cyber_cafe.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return openDatabase(
      path,
      version: _dbVersion,
      onConfigure: _onConfigure,
      onCreate: _createDB,
      onUpgrade: _upgradeDB,
    );
  }

  Future<void> _onConfigure(Database db) async {
    await db.rawQuery('PRAGMA foreign_keys = ON');
    await db.rawQuery('PRAGMA journal_mode = WAL');
    await db.rawQuery('PRAGMA synchronous = NORMAL');
    await db.rawQuery('PRAGMA cache_size = -8000');
  }

  Future<void> _createIndexes(Database db) async {
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_sessions_pc_status ON sessions(pc_id, status)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_time)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_orders_pc_session ON snack_orders(pc_id, session_id)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_orders_status ON snack_orders(status, timestamp)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_pcs_online ON pcs(is_online)');
  }

  Future<void> _createDB(Database db, int version) async {
    await _createTables(db);
    await _createV6Tables(db);
    await _createIndexes(db);
    await _seedDefaults(db);
  }

  Future<void> _upgradeDB(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await db.execute('''
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          cafe_name TEXT NOT NULL DEFAULT 'Cyber Cafe',
          currency TEXT NOT NULL DEFAULT 'EGP',
          server_port INTEGER NOT NULL DEFAULT 8080,
          api_token TEXT NOT NULL DEFAULT '',
          offline_grace_seconds INTEGER NOT NULL DEFAULT 300,
          minimum_session_minutes INTEGER NOT NULL DEFAULT 0,
          billing_rounding TEXT NOT NULL DEFAULT 'none',
          tax_percent REAL NOT NULL DEFAULT 0,
          manual_server_ip TEXT,
          onboarding_complete INTEGER NOT NULL DEFAULT 0
        )
      ''');

      await db.execute(
          'ALTER TABLE snack_orders ADD COLUMN session_id INTEGER');

      await db.execute(
          'ALTER TABLE sessions ADD COLUMN offline_duration INTEGER NOT NULL DEFAULT 0');

      await db.execute(
          'ALTER TABLE snacks ADD COLUMN is_enabled INTEGER NOT NULL DEFAULT 1');

      await db.execute(
          'ALTER TABLE pcs ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');

      final token = _generateToken();
      await db.insert('settings', {
        'id': 1,
        'cafe_name': 'Cyber Cafe',
        'currency': 'EGP',
        'server_port': 8080,
        'api_token': token,
        'offline_grace_seconds': 300,
        'minimum_session_minutes': 0,
        'billing_rounding': 'none',
        'tax_percent': 0,
        'onboarding_complete': 0,
      });

      // Backfill sort_order from id
      await db.execute('UPDATE pcs SET sort_order = id WHERE sort_order = 0');
    }
    if (oldVersion < 3) {
      await db.execute(
          'ALTER TABLE settings ADD COLUMN strict_snack_orders INTEGER NOT NULL DEFAULT 0');
      await db.execute('''
        CREATE TABLE IF NOT EXISTS pending_commands (
          pc_id INTEGER PRIMARY KEY,
          command TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      ''');
    }
    if (oldVersion < 4) {
      await _createIndexes(db);
      await repairDataIntegrity(db);
    }
    if (oldVersion < 5) {
      await db.execute('''
        CREATE TABLE IF NOT EXISTS control_commands (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pc_id INTEGER NOT NULL,
          command TEXT NOT NULL,
          payload TEXT,
          created_at INTEGER NOT NULL
        )
      ''');
      await db.execute(
          'CREATE INDEX IF NOT EXISTS idx_control_pc ON control_commands(pc_id, id)');
    }
    if (oldVersion < 6) {
      await _createV6Tables(db);
    }
  }

  Future<void> _createV6Tables(DatabaseExecutor db) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        notes TEXT,
        prepaid_balance REAL NOT NULL DEFAULT 0,
        loyalty_points INTEGER NOT NULL DEFAULT 0,
        total_spent REAL NOT NULL DEFAULT 0,
        visit_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pc_id INTEGER NOT NULL,
        customer_id INTEGER,
        customer_name TEXT NOT NULL,
        start_at INTEGER NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        status TEXT NOT NULL DEFAULT 'upcoming',
        notes TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pc_id INTEGER,
        category TEXT NOT NULL DEFAULT 'control',
        action TEXT NOT NULL,
        detail TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    ''');

    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_reservations_start ON reservations(start_at, status)');
    await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC)');
  }

  Future<void> _createTables(Database db) async {
    await db.execute('''
    CREATE TABLE settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      cafe_name TEXT NOT NULL DEFAULT 'Cyber Cafe',
      currency TEXT NOT NULL DEFAULT 'EGP',
      server_port INTEGER NOT NULL DEFAULT 8080,
      api_token TEXT NOT NULL DEFAULT '',
      offline_grace_seconds INTEGER NOT NULL DEFAULT 300,
      minimum_session_minutes INTEGER NOT NULL DEFAULT 0,
      billing_rounding TEXT NOT NULL DEFAULT 'none',
      tax_percent REAL NOT NULL DEFAULT 0,
      manual_server_ip TEXT,
      onboarding_complete INTEGER NOT NULL DEFAULT 0,
      strict_snack_orders INTEGER NOT NULL DEFAULT 0
    )
    ''');

    await db.execute('''
    CREATE TABLE pending_commands (
      pc_id INTEGER PRIMARY KEY,
      command TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
    ''');

    await db.execute('''
    CREATE TABLE control_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pc_id INTEGER NOT NULL,
      command TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL
    )
    ''');

    await db.execute('''
    CREATE TABLE pcs (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      hourly_rate REAL NOT NULL,
      is_online INTEGER DEFAULT 0,
      last_heartbeat INTEGER,
      current_session_id INTEGER,
      thumbnail TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
    ''');

    await db.execute('''
    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pc_id INTEGER NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration_seconds INTEGER DEFAULT 0,
      time_cost REAL DEFAULT 0,
      offline_duration INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (pc_id) REFERENCES pcs (id)
    )
    ''');

    await db.execute('''
    CREATE TABLE snacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price REAL NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
    ''');

    await db.execute('''
    CREATE TABLE snack_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pc_id INTEGER NOT NULL,
      session_id INTEGER,
      snack_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      total_price REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      timestamp INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (pc_id) REFERENCES pcs (id),
      FOREIGN KEY (session_id) REFERENCES sessions (id)
    )
    ''');

    await db.execute('''
    CREATE TABLE daily_statistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_revenue REAL DEFAULT 0,
      session_revenue REAL DEFAULT 0,
      snack_revenue REAL DEFAULT 0,
      total_hours REAL DEFAULT 0,
      total_sessions INTEGER DEFAULT 0,
      total_snack_orders INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
    ''');
  }

  String _generateToken() {
    const chars =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    final random = Random.secure();
    return List.generate(32, (_) => chars[random.nextInt(chars.length)]).join();
  }

  Future<void> _seedDefaults(Database db) async {
    final token = _generateToken();
    await db.insert('settings', {
      'id': 1,
      'cafe_name': 'Cyber Cafe',
      'currency': 'EGP',
      'server_port': 8080,
      'api_token': token,
      'offline_grace_seconds': 300,
      'minimum_session_minutes': 0,
      'billing_rounding': 'none',
      'tax_percent': 0,
      'onboarding_complete': 0,
      'strict_snack_orders': 0,
    });

    final pcs = [
      {'id': 1, 'name': 'VIP-01', 'type': 'VIP', 'hourly_rate': 25.0, 'sort_order': 1},
      {'id': 2, 'name': 'VIP-02', 'type': 'VIP', 'hourly_rate': 25.0, 'sort_order': 2},
      {'id': 3, 'name': 'VIP-03', 'type': 'VIP', 'hourly_rate': 25.0, 'sort_order': 3},
      {'id': 4, 'name': 'VIP-04', 'type': 'VIP', 'hourly_rate': 25.0, 'sort_order': 4},
      {'id': 5, 'name': 'VIP-05', 'type': 'VIP', 'hourly_rate': 25.0, 'sort_order': 5},
      {'id': 6, 'name': 'VIP-06', 'type': 'VIP', 'hourly_rate': 25.0, 'sort_order': 6},
      {'id': 7, 'name': 'Premium-01', 'type': 'Premium', 'hourly_rate': 20.0, 'sort_order': 7},
      {'id': 8, 'name': 'Premium-02', 'type': 'Premium', 'hourly_rate': 20.0, 'sort_order': 8},
      {'id': 9, 'name': 'Premium-03', 'type': 'Premium', 'hourly_rate': 20.0, 'sort_order': 9},
      {'id': 10, 'name': 'Premium-04', 'type': 'Premium', 'hourly_rate': 20.0, 'sort_order': 10},
      {'id': 11, 'name': 'Premium-05', 'type': 'Premium', 'hourly_rate': 20.0, 'sort_order': 11},
      {'id': 12, 'name': 'Premium-06', 'type': 'Premium', 'hourly_rate': 20.0, 'sort_order': 12},
      {'id': 13, 'name': 'Premium-07', 'type': 'Premium', 'hourly_rate': 20.0, 'sort_order': 13},
    ];

    for (var pc in pcs) {
      await db.insert('pcs', pc);
    }

    final snacks = [
      {'name': 'Cola', 'price': 10.0},
      {'name': 'Chips', 'price': 15.0},
      {'name': 'Coffee', 'price': 20.0},
      {'name': 'Water', 'price': 5.0},
      {'name': 'Chocolate', 'price': 25.0},
      {'name': 'Tea', 'price': 10.0},
      {'name': 'Juice', 'price': 15.0},
      {'name': 'Sandwich', 'price': 30.0},
    ];

    for (var snack in snacks) {
      await db.insert('snacks', snack);
    }
  }

  // Settings
  Future<CafeSettings> getSettings() async {
    final db = await database;
    final results = await db.query('settings', where: 'id = ?', whereArgs: [1]);
    if (results.isEmpty) {
      return const CafeSettings();
    }
    return CafeSettings.fromMap(results.first);
  }

  Future<void> saveSettings(CafeSettings settings) async {
    final db = await database;
    await db.update(
      'settings',
      settings.toMap(),
      where: 'id = ?',
      whereArgs: [1],
    );
  }

  Future<String> getApiToken() async {
    final settings = await getSettings();
    return settings.apiToken;
  }

  // PC Operations
  Future<List<Map<String, dynamic>>> getAllPCs() async {
    final db = await database;
    return await db.query('pcs', orderBy: 'sort_order ASC, id ASC');
  }

  Future<Map<String, dynamic>?> getPC(int id) async {
    final db = await database;
    final results = await db.query('pcs', where: 'id = ?', whereArgs: [id]);
    return results.isNotEmpty ? results.first : null;
  }

  Future<int> insertPC(Map<String, dynamic> pc) async {
    final db = await database;
    return await db.insert('pcs', pc);
  }

  Future<int> updatePC(int id, Map<String, dynamic> values) async {
    final db = await database;
    return await db.update('pcs', values, where: 'id = ?', whereArgs: [id]);
  }

  Future<int> deletePC(int id) async {
    final db = await database;
    final session = await getActiveSession(id);
    if (session != null) {
      throw StateError('Cannot delete PC with active session');
    }
    return await db.delete('pcs', where: 'id = ?', whereArgs: [id]);
  }

  /// Fix stale online flags and orphaned session references.
  Future<void> repairDataIntegrity([DatabaseExecutor? executor]) async {
    final db = executor ?? await database;
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    const offlineThreshold = 30;

    await db.rawUpdate('''
      UPDATE pcs SET is_online = 0
      WHERE is_online = 1
        AND (last_heartbeat IS NULL OR last_heartbeat < ?)
    ''', [now - offlineThreshold]);

    await db.rawUpdate('''
      UPDATE pcs SET current_session_id = NULL
      WHERE current_session_id IS NOT NULL
        AND current_session_id NOT IN (
          SELECT id FROM sessions WHERE status = 'active'
        )
    ''');

    await db.rawUpdate('''
      UPDATE sessions SET status = 'completed', end_time = ?
      WHERE status = 'active'
        AND pc_id NOT IN (
          SELECT id FROM pcs WHERE current_session_id = sessions.id
        )
    ''', [now]);
  }

  Future<Map<String, dynamic>> runIntegrityAudit() async {
    final db = await database;
    await repairDataIntegrity(db);

    final orphanSessions = await db.rawQuery('''
      SELECT COUNT(*) as c FROM sessions s
      WHERE s.status = 'active' AND NOT EXISTS (
        SELECT 1 FROM pcs p WHERE p.current_session_id = s.id
      )
    ''');

    final staleOnline = await db.rawQuery('''
      SELECT COUNT(*) as c FROM pcs WHERE is_online = 1
        AND (last_heartbeat IS NULL OR last_heartbeat < ?)
    ''', [DateTime.now().millisecondsSinceEpoch ~/ 1000 - 30]);

    return {
      'orphan_sessions': orphanSessions.first['c'] as int? ?? 0,
      'stale_online_pcs': staleOnline.first['c'] as int? ?? 0,
      'healthy': (orphanSessions.first['c'] as int? ?? 0) == 0 &&
          (staleOnline.first['c'] as int? ?? 0) == 0,
    };
  }

  Future<int> getNextPCId() async {
    final db = await database;
    final result =
        await db.rawQuery('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM pcs');
    return result.first['next_id'] as int;
  }

  Future<void> updatePCOfflineDuration(int pcId, int offlineDuration) async {
    final db = await database;
    final session = await getActiveSession(pcId);
    if (session == null) return;
    await db.update(
      'sessions',
      {'offline_duration': offlineDuration},
      where: 'id = ?',
      whereArgs: [session['id']],
    );
  }

  // Session Operations
  Future<int> createSession(int pcId, int startTime) async {
    final db = await database;

    // Close any orphan active sessions for this PC
    await db.update(
      'sessions',
      {
        'status': 'completed',
        'end_time': startTime,
        'duration_seconds': 0,
        'time_cost': 0,
      },
      where: 'pc_id = ? AND status = ?',
      whereArgs: [pcId, 'active'],
    );

    final sessionId = await db.insert('sessions', {
      'pc_id': pcId,
      'start_time': startTime,
      'status': 'active',
    });
    await db.update('pcs', {'current_session_id': sessionId},
        where: 'id = ?', whereArgs: [pcId]);
    await logActivity('Session started',
        pcId: pcId, category: 'session', detail: 'Session #$sessionId');
    return sessionId;
  }

  Future<bool> hasActiveSession(int pcId) async {
    final session = await getActiveSession(pcId);
    return session != null;
  }

  Future<SessionEndResult> endSession({
    required int sessionId,
    required int endTime,
    required int rawDurationSeconds,
    required int offlineDurationSeconds,
    required double hourlyRate,
    required CafeSettings settings,
  }) async {
    final db = await database;

    final billableRaw = rawDurationSeconds;
    final grace = settings.offlineGraceSeconds;
    final offlineBeyondGrace = offlineDurationSeconds > grace
        ? offlineDurationSeconds - grace
        : 0;
    final billableSeconds = billableRaw + offlineBeyondGrace;

    var adjustedSeconds = billableSeconds;
    final minimum = settings.minimumSessionMinutes * 60;
    if (minimum > 0 && adjustedSeconds > 0 && adjustedSeconds < minimum) {
      adjustedSeconds = minimum;
    }
    switch (settings.billingRounding) {
      case '5min':
        adjustedSeconds = _roundUp(adjustedSeconds, 300);
      case '15min':
        adjustedSeconds = _roundUp(adjustedSeconds, 900);
      default:
        break;
    }

    var cost = (adjustedSeconds / 3600) * hourlyRate;
    if (settings.taxPercent > 0) {
      cost *= (1 + settings.taxPercent / 100);
    }

    late int pcId;

    await db.transaction((txn) async {
      await txn.update(
        'sessions',
        {
          'end_time': endTime,
          'duration_seconds': adjustedSeconds,
          'time_cost': cost,
          'offline_duration': offlineDurationSeconds,
          'status': 'completed',
        },
        where: 'id = ?',
        whereArgs: [sessionId],
      );

      final session = await txn.query('sessions',
          where: 'id = ?', whereArgs: [sessionId]);
      pcId = session.first['pc_id'] as int;

      await txn.update('pcs', {'current_session_id': null},
          where: 'id = ?', whereArgs: [pcId]);

      await _updateDailyStatistics(txn);
    });

    await logActivity('Session ended',
        pcId: pcId,
        category: 'session',
        detail:
            'Session #$sessionId · ${(adjustedSeconds / 60).round()} min · ${cost.toStringAsFixed(2)}');

    return SessionEndResult(
      sessionId: sessionId,
      pcId: pcId,
      rawDurationSeconds: rawDurationSeconds,
      billableSeconds: adjustedSeconds,
      offlineDurationSeconds: offlineDurationSeconds,
      timeCost: cost,
    );
  }

  int _roundUp(int seconds, int interval) {
    if (seconds <= 0) return 0;
    return ((seconds + interval - 1) ~/ interval) * interval;
  }

  Future<Map<String, dynamic>?> getActiveSession(int pcId) async {
    final db = await database;
    final results = await db.query(
      'sessions',
      where: 'pc_id = ? AND status = ?',
      whereArgs: [pcId, 'active'],
    );
    return results.isNotEmpty ? results.first : null;
  }

  Future<Map<String, dynamic>?> getSession(int sessionId) async {
    final db = await database;
    final results =
        await db.query('sessions', where: 'id = ?', whereArgs: [sessionId]);
    return results.isNotEmpty ? results.first : null;
  }

  Future<int> updateSessionStartTime(int pcId, int newStartTime) async {
    final db = await database;
    return await db.rawUpdate('''
      UPDATE sessions 
      SET start_time = ? 
      WHERE pc_id = ? AND status = 'active' AND start_time > ?
    ''', [newStartTime, pcId, newStartTime]);
  }

  Future<List<Map<String, dynamic>>> getSessionsByDateRange(
      String startDate, String endDate) async {
    final db = await database;
    return await db.rawQuery('''
      SELECT s.*, p.name as pc_name, p.type as pc_type
      FROM sessions s
      JOIN pcs p ON s.pc_id = p.id
      WHERE date(s.start_time, 'unixepoch', 'localtime') BETWEEN ? AND ?
      ORDER BY s.start_time DESC
    ''', [startDate, endDate]);
  }

  Future<List<Map<String, dynamic>>> getSessionsByDate(String date) async {
    return getSessionsByDateRange(date, date);
  }

  // Snack Operations
  Future<List<Map<String, dynamic>>> getAllSnacks({bool enabledOnly = false}) async {
    final db = await database;
    if (enabledOnly) {
      return await db.query('snacks',
          where: 'is_enabled = ?', whereArgs: [1], orderBy: 'name ASC');
    }
    return await db.query('snacks', orderBy: 'name ASC');
  }

  Future<int> insertSnack(String name, double price) async {
    final db = await database;
    return await db.insert('snacks', {'name': name, 'price': price});
  }

  Future<int> updateSnack(int id, Map<String, dynamic> values) async {
    final db = await database;
    return await db.update('snacks', values, where: 'id = ?', whereArgs: [id]);
  }

  Future<int> deleteSnack(int id) async {
    final db = await database;
    return await db.delete('snacks', where: 'id = ?', whereArgs: [id]);
  }

  Future<int> addSnackOrder(
    int pcId,
    String snackName,
    int quantity,
    double price, {
    int? sessionId,
  }) async {
    final db = await database;
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    if (sessionId == null) {
      final session = await getActiveSession(pcId);
      sessionId = session?['id'] as int?;
    }

    return await db.insert('snack_orders', {
      'pc_id': pcId,
      'session_id': sessionId,
      'snack_name': snackName,
      'quantity': quantity,
      'price': price,
      'total_price': price * quantity,
      'status': 'pending',
      'timestamp': now,
    });
  }

  Future<int> updateSnackOrderStatus(int orderId, String status) async {
    final db = await database;
    final result = await db.update(
      'snack_orders',
      {'status': status},
      where: 'id = ?',
      whereArgs: [orderId],
    );
    if (status == 'delivered') {
      await _updateDailyStatistics(db);
    }
    return result;
  }

  Future<List<Map<String, dynamic>>> getPendingSnackOrders() async {
    final db = await database;
    return await db.query(
      'snack_orders',
      where: 'status = ?',
      whereArgs: ['pending'],
      orderBy: 'timestamp DESC',
    );
  }

  Future<List<Map<String, dynamic>>> getSnackOrdersByPC(int pcId,
      {int? sessionId}) async {
    final db = await database;
    if (sessionId != null) {
      return await db.query(
        'snack_orders',
        where: 'pc_id = ? AND session_id = ?',
        whereArgs: [pcId, sessionId],
        orderBy: 'timestamp DESC',
      );
    }
    return await db.query(
      'snack_orders',
      where: 'pc_id = ?',
      whereArgs: [pcId],
      orderBy: 'timestamp DESC',
    );
  }

  Future<double> getSnackTotalForSession(int sessionId) async {
    final db = await database;
    final result = await db.rawQuery('''
      SELECT COALESCE(SUM(total_price), 0) as total
      FROM snack_orders
      WHERE session_id = ? AND status != 'cancelled'
    ''', [sessionId]);
    return (result.first['total'] as num?)?.toDouble() ?? 0.0;
  }

  Future<double> getDeliveredSnackTotalForSession(int sessionId) async {
    final db = await database;
    final result = await db.rawQuery('''
      SELECT COALESCE(SUM(total_price), 0) as total
      FROM snack_orders
      WHERE session_id = ? AND status = 'delivered'
    ''', [sessionId]);
    return (result.first['total'] as num?)?.toDouble() ?? 0.0;
  }

  Future<Map<String, dynamic>?> getSnackByName(String name) async {
    final db = await database;
    final results = await db.query(
      'snacks',
      where: 'LOWER(name) = ?',
      whereArgs: [name.toLowerCase()],
    );
    return results.isNotEmpty ? results.first : null;
  }

  Future<void> savePendingCommand(int pcId, String command) async {
    final db = await database;
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    await db.insert(
      'pending_commands',
      {'pc_id': pcId, 'command': command, 'created_at': now},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<String> peekPendingCommand(int pcId) async {
    final db = await database;
    final results = await db.query(
      'pending_commands',
      where: 'pc_id = ?',
      whereArgs: [pcId],
    );
    if (results.isEmpty) return 'none';
    return results.first['command'] as String;
  }

  Future<void> clearPendingCommand(int pcId) async {
    final db = await database;
    await db.delete('pending_commands', where: 'pc_id = ?', whereArgs: [pcId]);
  }

  Future<String> consumePendingCommand(int pcId) async {
    final command = await peekPendingCommand(pcId);
    if (command != 'none') {
      await clearPendingCommand(pcId);
    }
    return command;
  }

  // Control command queue (FIFO, consumed on delivery). Used for transient
  // remote actions like lock/unlock/shutdown/restart/sleep/message that are
  // separate from the persistent session start/stop command.
  Future<void> queueControlCommand(
    int pcId,
    String command, {
    String? payload,
  }) async {
    final db = await database;
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    await db.insert('control_commands', {
      'pc_id': pcId,
      'command': command,
      'payload': payload,
      'created_at': now,
    });
  }

  /// Returns and removes the oldest queued control command for [pcId], or null.
  Future<Map<String, dynamic>?> dequeueControlCommand(int pcId) async {
    final db = await database;
    return db.transaction((txn) async {
      final rows = await txn.query(
        'control_commands',
        where: 'pc_id = ?',
        whereArgs: [pcId],
        orderBy: 'id ASC',
        limit: 1,
      );
      if (rows.isEmpty) return null;
      final row = rows.first;
      await txn.delete(
        'control_commands',
        where: 'id = ?',
        whereArgs: [row['id']],
      );
      return {
        'command': row['command'] as String,
        'payload': row['payload'] as String?,
      };
    });
  }

  Future<void> clearControlCommands(int pcId) async {
    final db = await database;
    await db.delete('control_commands', where: 'pc_id = ?', whereArgs: [pcId]);
  }

  // Statistics
  Future<void> _updateDailyStatistics(DatabaseExecutor db) async {
    final today = DateTime.now().toIso8601String().split('T')[0];

    final sessionStats = await db.rawQuery('''
      SELECT 
        COALESCE(SUM(time_cost), 0) as session_revenue,
        COALESCE(SUM(duration_seconds), 0) as total_seconds,
        COUNT(*) as total_sessions
      FROM sessions 
      WHERE date(start_time, 'unixepoch', 'localtime') = ? AND status = 'completed'
    ''', [today]);

    final snackStats = await db.rawQuery('''
      SELECT 
        COALESCE(SUM(total_price), 0) as snack_revenue,
        COUNT(*) as total_orders
      FROM snack_orders 
      WHERE date(timestamp, 'unixepoch', 'localtime') = ? AND status = 'delivered'
    ''', [today]);

    final sessionData = sessionStats.first;
    final snackData = snackStats.first;
    final sessionRev =
        (sessionData['session_revenue'] as num?)?.toDouble() ?? 0.0;
    final snackRev = (snackData['snack_revenue'] as num?)?.toDouble() ?? 0.0;

    await db.insert(
      'daily_statistics',
      {
        'date': today,
        'total_revenue': sessionRev + snackRev,
        'session_revenue': sessionRev,
        'snack_revenue': snackRev,
        'total_hours':
            ((sessionData['total_seconds'] as num?)?.toDouble() ?? 0.0) /
                3600.0,
        'total_sessions': sessionData['total_sessions'] as int? ?? 0,
        'total_snack_orders': snackData['total_orders'] as int? ?? 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<Map<String, dynamic>> getTodayStatistics() async {
    final db = await database;
    final today = DateTime.now().toIso8601String().split('T')[0];

    final cached = await db.query('daily_statistics',
        where: 'date = ?', whereArgs: [today]);
    if (cached.isNotEmpty) {
      return cached.first;
    }

    final sessionStats = await db.rawQuery('''
      SELECT 
        COALESCE(SUM(time_cost), 0) as session_revenue,
        COALESCE(SUM(duration_seconds), 0) as total_seconds,
        COUNT(*) as total_sessions
      FROM sessions 
      WHERE date(start_time, 'unixepoch', 'localtime') = ? AND status = 'completed'
    ''', [today]);

    final snackStats = await db.rawQuery('''
      SELECT 
        COALESCE(SUM(total_price), 0) as snack_revenue,
        COUNT(*) as total_orders
      FROM snack_orders 
      WHERE date(timestamp, 'unixepoch', 'localtime') = ? AND status = 'delivered'
    ''', [today]);

    final sessionData = sessionStats.first;
    final snackData = snackStats.first;

    return {
      'session_revenue':
          (sessionData['session_revenue'] as num?)?.toDouble() ?? 0.0,
      'snack_revenue': (snackData['snack_revenue'] as num?)?.toDouble() ?? 0.0,
      'total_revenue':
          ((sessionData['session_revenue'] as num?)?.toDouble() ?? 0.0) +
              ((snackData['snack_revenue'] as num?)?.toDouble() ?? 0.0),
      'total_hours':
          ((sessionData['total_seconds'] as num?)?.toDouble() ?? 0.0) / 3600.0,
      'total_sessions': (sessionData['total_sessions'] as int?) ?? 0,
      'total_snack_orders': (snackData['total_orders'] as int?) ?? 0,
    };
  }

  Future<List<Map<String, dynamic>>> getDailyStatisticsRange(
      int days) async {
    final db = await database;
    final end = DateTime.now();
    final start = end.subtract(Duration(days: days - 1));
    return await db.query(
      'daily_statistics',
      where: 'date >= ? AND date <= ?',
      whereArgs: [
        start.toIso8601String().split('T')[0],
        end.toIso8601String().split('T')[0],
      ],
      orderBy: 'date ASC',
    );
  }

  // Customer Operations
  Future<List<Map<String, dynamic>>> getAllCustomers() async {
    final db = await database;
    return await db.query('customers', orderBy: 'name ASC');
  }

  Future<int> insertCustomer(Map<String, dynamic> customer) async {
    final db = await database;
    return await db.insert('customers', customer);
  }

  Future<int> updateCustomer(int id, Map<String, dynamic> values) async {
    final db = await database;
    return await db
        .update('customers', values, where: 'id = ?', whereArgs: [id]);
  }

  Future<int> deleteCustomer(int id) async {
    final db = await database;
    return await db.delete('customers', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> recordCustomerVisit(int id, double spent) async {
    final db = await database;
    await db.rawUpdate('''
      UPDATE customers
      SET total_spent = total_spent + ?,
          visit_count = visit_count + 1,
          loyalty_points = loyalty_points + CAST(? / 10 AS INTEGER)
      WHERE id = ?
    ''', [spent, spent, id]);
  }

  Future<void> adjustPrepaidBalance(int id, double delta) async {
    final db = await database;
    await db.rawUpdate(
        'UPDATE customers SET prepaid_balance = MAX(0, prepaid_balance + ?) WHERE id = ?',
        [delta, id]);
  }

  // Reservation Operations
  Future<List<Map<String, dynamic>>> getReservations(
      {bool upcomingOnly = false}) async {
    final db = await database;
    if (upcomingOnly) {
      return await db.rawQuery('''
        SELECT r.*, p.name as pc_name FROM reservations r
        LEFT JOIN pcs p ON p.id = r.pc_id
        WHERE r.status = 'upcoming'
        ORDER BY r.start_at ASC
      ''');
    }
    return await db.rawQuery('''
      SELECT r.*, p.name as pc_name FROM reservations r
      LEFT JOIN pcs p ON p.id = r.pc_id
      ORDER BY r.start_at DESC
      LIMIT 200
    ''');
  }

  Future<int> insertReservation(Map<String, dynamic> reservation) async {
    final db = await database;
    return await db.insert('reservations', reservation);
  }

  Future<int> updateReservationStatus(int id, String status) async {
    final db = await database;
    return await db.update('reservations', {'status': status},
        where: 'id = ?', whereArgs: [id]);
  }

  /// Reservations whose start time is within [windowMinutes] from now.
  Future<List<Map<String, dynamic>>> getDueReservations(
      {int windowMinutes = 15}) async {
    final db = await database;
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    return await db.rawQuery('''
      SELECT r.*, p.name as pc_name FROM reservations r
      LEFT JOIN pcs p ON p.id = r.pc_id
      WHERE r.status = 'upcoming' AND r.start_at <= ?
      ORDER BY r.start_at ASC
    ''', [now + windowMinutes * 60]);
  }

  // Activity Log Operations
  Future<void> logActivity(String action,
      {int? pcId, String category = 'control', String? detail}) async {
    try {
      final db = await database;
      await db.insert('activity_log', {
        'pc_id': pcId,
        'category': category,
        'action': action,
        'detail': detail,
      });
    } catch (e) {
      AppLogger.warn('Failed to log activity: $e');
    }
  }

  Future<List<Map<String, dynamic>>> getActivityLog(
      {int limit = 200, String? category}) async {
    final db = await database;
    if (category != null && category.isNotEmpty) {
      return await db.rawQuery('''
        SELECT a.*, p.name as pc_name FROM activity_log a
        LEFT JOIN pcs p ON p.id = a.pc_id
        WHERE a.category = ?
        ORDER BY a.id DESC LIMIT ?
      ''', [category, limit]);
    }
    return await db.rawQuery('''
      SELECT a.*, p.name as pc_name FROM activity_log a
      LEFT JOIN pcs p ON p.id = a.pc_id
      ORDER BY a.id DESC LIMIT ?
    ''', [limit]);
  }

  Future<void> close() async {
    final db = await database;
    await db.close();
    _database = null;
  }
}

class SessionEndResult {
  final int sessionId;
  final int pcId;
  final int rawDurationSeconds;
  final int billableSeconds;
  final int offlineDurationSeconds;
  final double timeCost;

  SessionEndResult({
    required this.sessionId,
    required this.pcId,
    required this.rawDurationSeconds,
    required this.billableSeconds,
    required this.offlineDurationSeconds,
    required this.timeCost,
  });
}
