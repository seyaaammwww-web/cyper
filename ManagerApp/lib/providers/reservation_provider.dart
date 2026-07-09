import 'dart:async';
import 'package:flutter/material.dart';
import '../database/database_helper.dart';
import '../models/reservation.dart';

class ReservationProvider extends ChangeNotifier {
  List<Reservation> _reservations = [];
  Timer? _dueTimer;

  List<Reservation> get reservations => _reservations;
  List<Reservation> get upcoming =>
      _reservations.where((r) => r.status == 'upcoming').toList();
  int get dueSoonCount => upcoming.where((r) => r.isDueSoon).length;

  ReservationProvider() {
    loadReservations();
    _dueTimer = Timer.periodic(
        const Duration(minutes: 1), (_) => notifyListeners());
  }

  @override
  void dispose() {
    _dueTimer?.cancel();
    super.dispose();
  }

  Future<void> loadReservations() async {
    final maps = await DatabaseHelper.instance.getReservations();
    _reservations = maps.map((m) => Reservation.fromMap(m)).toList();
    notifyListeners();
  }

  Future<void> addReservation({
    required int pcId,
    required String customerName,
    int? customerId,
    required DateTime startAt,
    int durationMinutes = 60,
    String? notes,
  }) async {
    await DatabaseHelper.instance.insertReservation({
      'pc_id': pcId,
      'customer_id': customerId,
      'customer_name': customerName,
      'start_at': startAt.millisecondsSinceEpoch ~/ 1000,
      'duration_minutes': durationMinutes,
      'notes': notes,
    });
    await DatabaseHelper.instance.logActivity('Reservation created',
        pcId: pcId,
        category: 'reservation',
        detail: '$customerName @ ${startAt.toLocal()}');
    await loadReservations();
  }

  Future<void> setStatus(int id, String status) async {
    await DatabaseHelper.instance.updateReservationStatus(id, status);
    await DatabaseHelper.instance.logActivity('Reservation $status',
        category: 'reservation', detail: '#$id');
    await loadReservations();
  }
}
