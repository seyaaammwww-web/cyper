class Session {
  final int id;
  final int pcId;
  final int startTime;
  int? endTime;
  int durationSeconds;
  double timeCost;
  String status;

  Session({
    required this.id,
    required this.pcId,
    required this.startTime,
    this.endTime,
    this.durationSeconds = 0,
    this.timeCost = 0.0,
    this.status = 'active',
  });

  factory Session.fromMap(Map<String, dynamic> map) {
    return Session(
      id: map['id'] as int,
      pcId: map['pc_id'] as int,
      startTime: map['start_time'] as int,
      endTime: map['end_time'] as int?,
      durationSeconds: map['duration_seconds'] as int? ?? 0,
      timeCost: (map['time_cost'] as num?)?.toDouble() ?? 0.0,
      status: map['status'] as String? ?? 'active',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'pc_id': pcId,
      'start_time': startTime,
      'end_time': endTime,
      'duration_seconds': durationSeconds,
      'time_cost': timeCost,
      'status': status,
    };
  }

  Duration get duration => Duration(seconds: durationSeconds);

  DateTime get startDateTime =>
      DateTime.fromMillisecondsSinceEpoch(startTime * 1000);

  DateTime? get endDateTime => endTime != null
      ? DateTime.fromMillisecondsSinceEpoch(endTime! * 1000)
      : null;
}
