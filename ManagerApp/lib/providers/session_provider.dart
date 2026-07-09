import 'dart:async';
import 'package:flutter/material.dart';
import '../database/database_helper.dart';
import '../models/session.dart';

class SessionProvider extends ChangeNotifier {
  Map<int, Session> _activeSessions = {};
  Timer? _updateTimer;

  Map<int, Session> get activeSessions => _activeSessions;
  
  SessionProvider() {
    _initialize();
  }

  Future<void> _initialize() async {
    await _loadActiveSessions();
    _startUpdateTimer();
  }

  Future<void> _loadActiveSessions() async {
    final db = DatabaseHelper.instance;
    final pcs = await db.getAllPCs();
    
    _activeSessions.clear();
    
    for (var pc in pcs) {
      final sessionId = pc['current_session_id'] as int?;
      if (sessionId != null) {
        final session = await db.getActiveSession(pc['id'] as int);
        if (session != null) {
          _activeSessions[pc['id'] as int] = Session.fromMap(session);
        }
      }
    }
    
    notifyListeners();
  }

  void _startUpdateTimer() {
    _updateTimer?.cancel();
    _updateTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_activeSessions.isNotEmpty) notifyListeners();
    });
  }

  Session? getActiveSession(int pcId) {
    return _activeSessions[pcId];
  }

  int getSessionDuration(int pcId) {
    final session = _activeSessions[pcId];
    if (session == null) return 0;
    
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    return now - session.startTime;
  }

  double getCurrentCost(int pcId, double hourlyRate) {
    final duration = getSessionDuration(pcId);
    return (duration / 3600) * hourlyRate;
  }

  String formatDuration(int seconds) {
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;
    
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  Future<void> refreshSessions() async {
    await _loadActiveSessions();
  }

  @override
  void dispose() {
    _updateTimer?.cancel();
    super.dispose();
  }
}
