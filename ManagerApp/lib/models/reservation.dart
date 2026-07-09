class Reservation {
  final int id;
  final int pcId;
  final String? pcName;
  final int? customerId;
  final String customerName;
  final DateTime startAt;
  final int durationMinutes;
  final String status;
  final String? notes;

  Reservation({
    required this.id,
    required this.pcId,
    this.pcName,
    this.customerId,
    required this.customerName,
    required this.startAt,
    this.durationMinutes = 60,
    this.status = 'upcoming',
    this.notes,
  });

  factory Reservation.fromMap(Map<String, dynamic> map) {
    return Reservation(
      id: map['id'] as int,
      pcId: map['pc_id'] as int,
      pcName: map['pc_name'] as String?,
      customerId: map['customer_id'] as int?,
      customerName: map['customer_name'] as String,
      startAt: DateTime.fromMillisecondsSinceEpoch(
          (map['start_at'] as int) * 1000),
      durationMinutes: (map['duration_minutes'] as int?) ?? 60,
      status: (map['status'] as String?) ?? 'upcoming',
      notes: map['notes'] as String?,
    );
  }

  bool get isDueSoon {
    final now = DateTime.now();
    return status == 'upcoming' &&
        startAt.isBefore(now.add(const Duration(minutes: 15)));
  }

  bool get isOverdue =>
      status == 'upcoming' && startAt.isBefore(DateTime.now());
}
