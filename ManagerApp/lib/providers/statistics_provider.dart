import 'dart:async';
import 'package:flutter/material.dart';
import '../database/database_helper.dart';
import '../models/statistics.dart';
import 'pc_provider.dart';

class StatisticsProvider extends ChangeNotifier {
  Statistics _statistics = Statistics();
  Timer? _updateTimer;
  PCProvider? _pcProvider;

  Statistics get statistics => _statistics;

  StatisticsProvider() {
    _initialize();
  }

  void setPCProvider(PCProvider provider) {
    _pcProvider = provider;
  }

  Future<void> _initialize() async {
    await refreshStatistics();
    _startUpdateTimer();
  }

  void _startUpdateTimer() {
    _updateTimer?.cancel();
    _updateTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      refreshStatistics();
    });
  }

  Future<void> refreshStatistics() async {
    final db = DatabaseHelper.instance;
    final statsMap = await db.getTodayStatistics();

    int activePCs = _pcProvider?.activePCs.length ?? 0;

    _statistics = Statistics.fromMap(statsMap, activePCs);
    notifyListeners();
  }

  @override
  void dispose() {
    _updateTimer?.cancel();
    super.dispose();
  }
}
