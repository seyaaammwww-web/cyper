import 'package:flutter/material.dart';
import '../database/database_helper.dart';
import '../models/snack.dart';
import '../models/snack_order.dart';
import '../models/session.dart';
import '../providers/statistics_provider.dart';

class SnackProvider extends ChangeNotifier {
  List<Snack> _snacks = [];
  List<SnackOrder> _pendingOrders = [];
  StatisticsProvider? _statisticsProvider;

  List<Snack> get snacks => _snacks;
  List<Snack> get enabledSnacks =>
      _snacks.where((s) => s.isEnabled).toList();
  List<SnackOrder> get pendingOrders => _pendingOrders;
  int get pendingCount => _pendingOrders.length;

  SnackProvider() {
    _initialize();
  }

  void setStatisticsProvider(StatisticsProvider provider) {
    _statisticsProvider = provider;
  }

  Future<void> _initialize() async {
    await Future.wait([loadSnacks(), refreshOrders()]);
  }

  Future<void> loadSnacks() async {
    final db = DatabaseHelper.instance;
    final snackMaps = await db.getAllSnacks();
    _snacks = snackMaps.map((map) => Snack.fromMap(map)).toList();
    notifyListeners();
  }

  Future<void> refreshOrders() async {
    final db = DatabaseHelper.instance;
    final orderMaps = await db.getPendingSnackOrders();
    _pendingOrders = orderMaps.map((map) => SnackOrder.fromMap(map)).toList();
    notifyListeners();
  }

  Snack? getSnackByName(String name) {
    try {
      return _snacks
          .firstWhere((s) => s.name.toLowerCase() == name.toLowerCase());
    } catch (_) {
      return null;
    }
  }

  Future<List<SnackOrder>> getOrdersForPC(int pcId, {Session? session}) async {
    final db = DatabaseHelper.instance;
    final sessionId = session?.id;
    final maps = await db.getSnackOrdersByPC(pcId, sessionId: sessionId);
    return maps.map((m) => SnackOrder.fromMap(m)).toList();
  }

  Future<void> markOrderDelivered(int orderId) async {
    final db = DatabaseHelper.instance;
    await db.updateSnackOrderStatus(orderId, 'delivered');
    await refreshOrders();
    await _statisticsProvider?.refreshStatistics();
  }

  Future<void> markOrderCancelled(int orderId) async {
    final db = DatabaseHelper.instance;
    await db.updateSnackOrderStatus(orderId, 'cancelled');
    await refreshOrders();
  }

  Future<void> addManualOrder(
      int pcId, String snackName, int quantity, double price) async {
    final db = DatabaseHelper.instance;
    await db.addSnackOrder(pcId, snackName, quantity, price);
    await refreshOrders();
  }

  Future<double> calculateTotalForSession(int sessionId) async {
    return DatabaseHelper.instance.getSnackTotalForSession(sessionId);
  }

  Future<double> calculateDeliveredTotalForSession(int sessionId) async {
    return DatabaseHelper.instance.getDeliveredSnackTotalForSession(sessionId);
  }

  Future<void> addSnack(String name, double price) async {
    await DatabaseHelper.instance.insertSnack(name, price);
    await loadSnacks();
  }

  Future<void> updateSnackItem(
      int id, String name, double price, bool enabled) async {
    await DatabaseHelper.instance.updateSnack(id, {
      'name': name,
      'price': price,
      'is_enabled': enabled ? 1 : 0,
    });
    await loadSnacks();
  }

  Future<void> deleteSnack(int id) async {
    await DatabaseHelper.instance.deleteSnack(id);
    await loadSnacks();
  }
}
