import 'dart:async';
import 'package:flutter/material.dart';
import '../database/database_helper.dart';
import '../models/pc.dart';
import '../models/cafe_settings.dart';
import '../services/notification_service.dart';
import 'session_provider.dart';
import 'statistics_provider.dart';

typedef SessionChangedCallback = Future<void> Function();

class PCProvider extends ChangeNotifier {
  List<PC> _pcs = [];
  final Map<int, String> _pendingCommands = {};
  final Map<int, int> _offlineDurations = {};
  Timer? _heartbeatTimer;
  static const int _offlineThreshold = 15;

  SessionProvider? _sessionProvider;
  StatisticsProvider? _statisticsProvider;
  CafeSettings _settings = const CafeSettings();

  List<PC> get pcs => _pcs;
  List<PC> get vipPCs => _pcs.where((pc) => pc.type == 'VIP').toList();
  List<PC> get premiumPCs =>
      _pcs.where((pc) => pc.type == 'Premium').toList();
  List<PC> get onlinePCs => _pcs.where((pc) => pc.isOnline).toList();
  List<PC> get activePCs =>
      _pcs.where((pc) => pc.isOnline && pc.currentSessionId != null).toList();

  PCProvider() {
    _initialize();
  }

  void setDependencies({
    SessionProvider? sessionProvider,
    StatisticsProvider? statisticsProvider,
    CafeSettings? settings,
  }) {
    _sessionProvider = sessionProvider;
    _statisticsProvider = statisticsProvider;
    if (settings != null) _settings = settings;
  }

  void updateSettings(CafeSettings settings) {
    _settings = settings;
  }

  Future<void> _initialize() async {
    _settings = await DatabaseHelper.instance.getSettings();
    await refreshPCs();
    _startHeartbeatCheck();
  }

  Future<void> refreshPCs() async {
    final db = DatabaseHelper.instance;
    final pcMaps = await db.getAllPCs();
    _pcs = pcMaps.map((map) => PC.fromMap(map)).toList();
    notifyListeners();
  }

  void _startHeartbeatCheck() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _checkHeartbeats();
    });
  }

  void _checkHeartbeats() {
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    var hasChanges = false;

    for (var i = 0; i < _pcs.length; i++) {
      final pc = _pcs[i];
      if (pc.isOnline && pc.lastHeartbeat != null) {
        final elapsed = now - pc.lastHeartbeat!;
        if (elapsed > _offlineThreshold) {
          _pcs[i] = pc.copyWith(isOnline: false);
          hasChanges = true;
          DatabaseHelper.instance.updatePC(pc.id, {'is_online': 0});
          NotificationService.instance.showPCOfflineNotification(pcId: pc.id);
        }
      }
    }

    if (hasChanges) notifyListeners();
  }

  void updatePCStatus(
    int pcId,
    bool isOnline, {
    String? thumbnail,
    int? offlineDuration,
  }) {
    final index = _pcs.indexWhere((pc) => pc.id == pcId);
    if (index == -1) return;

    _pcs[index] = _pcs[index].copyWith(
      isOnline: isOnline,
      lastHeartbeat: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      thumbnail: thumbnail,
    );

    if (offlineDuration != null) {
      _offlineDurations[pcId] = offlineDuration;
      DatabaseHelper.instance.updatePCOfflineDuration(pcId, offlineDuration);
    }

    notifyListeners();
  }

  PC? getPC(int pcId) {
    try {
      return _pcs.firstWhere((pc) => pc.id == pcId);
    } catch (_) {
      return null;
    }
  }

  void setPendingCommand(int pcId, String command) {
    _pendingCommands[pcId] = command;
    DatabaseHelper.instance.savePendingCommand(pcId, command);
  }

  Future<String> getPendingCommand(int pcId) async {
    // Peek — command persists until client confirms via heartbeat
    final dbCommand = await DatabaseHelper.instance.peekPendingCommand(pcId);
    if (dbCommand != 'none') return dbCommand;
    return _pendingCommands[pcId] ?? 'none';
  }

  Future<void> acknowledgeCommand(int pcId, String command) async {
    _pendingCommands.remove(pcId);
    await DatabaseHelper.instance.clearPendingCommand(pcId);
  }

  Future<void> startSession(int pcId) async {
    final db = DatabaseHelper.instance;

    if (await db.hasActiveSession(pcId)) {
      throw StateError('PC already has an active session');
    }

    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    await db.createSession(pcId, now);
    setPendingCommand(pcId, 'start');
    _offlineDurations.remove(pcId);

    await refreshPCs();
    await _sessionProvider?.refreshSessions();
    await _statisticsProvider?.refreshStatistics();

    NotificationService.instance.showSessionNotification(
      pcId: pcId,
      action: 'started',
    );
    notifyListeners();
  }

  Future<SessionEndResult?> stopSession(int pcId) async {
    final db = DatabaseHelper.instance;
    final pc = await db.getPC(pcId);
    if (pc == null) return null;

    final sessionId = pc['current_session_id'] as int?;
    if (sessionId == null) return null;

    final session = await db.getActiveSession(pcId);
    if (session == null) return null;

    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final startTime = session['start_time'] as int;
    final rawDuration = now - startTime;
    final offlineDuration = _offlineDurations[pcId] ??
        (session['offline_duration'] as int? ?? 0);
    final hourlyRate = (pc['hourly_rate'] as num).toDouble();

    final result = await db.endSession(
      sessionId: sessionId,
      endTime: now,
      rawDurationSeconds: rawDuration,
      offlineDurationSeconds: offlineDuration,
      hourlyRate: hourlyRate,
      settings: _settings,
    );

    setPendingCommand(pcId, 'stop');
    _offlineDurations.remove(pcId);

    await refreshPCs();
    await _sessionProvider?.refreshSessions();
    await _statisticsProvider?.refreshStatistics();

    NotificationService.instance.showSessionNotification(
      pcId: pcId,
      action: 'ended',
    );
    notifyListeners();
    return result;
  }

  Future<int> addPC({
    required String name,
    required String type,
    required double hourlyRate,
  }) async {
    final db = DatabaseHelper.instance;
    final id = await db.getNextPCId();
    await db.insertPC({
      'id': id,
      'name': name,
      'type': type,
      'hourly_rate': hourlyRate,
      'sort_order': id,
    });
    await refreshPCs();
    return id;
  }

  Future<void> updatePCDetails(
    int id, {
    String? name,
    String? type,
    double? hourlyRate,
  }) async {
    final updates = <String, dynamic>{};
    if (name != null) updates['name'] = name;
    if (type != null) updates['type'] = type;
    if (hourlyRate != null) updates['hourly_rate'] = hourlyRate;
    if (updates.isNotEmpty) {
      await DatabaseHelper.instance.updatePC(id, updates);
      await refreshPCs();
    }
  }

  Future<void> deletePC(int id) async {
    await DatabaseHelper.instance.deletePC(id);
    await refreshPCs();
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    super.dispose();
  }
}
