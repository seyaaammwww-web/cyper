class PC {
  final int id;
  final String name;
  final String type;
  final double hourlyRate;
  bool isOnline;
  int? lastHeartbeat;
  int? currentSessionId;
  String? thumbnail;
  int? sessionStartTime;

  PC({
    required this.id,
    required this.name,
    required this.type,
    required this.hourlyRate,
    this.isOnline = false,
    this.lastHeartbeat,
    this.currentSessionId,
    this.thumbnail,
    this.sessionStartTime,
  });

  factory PC.fromMap(Map<String, dynamic> map) {
    return PC(
      id: map['id'] as int,
      name: map['name'] as String,
      type: map['type'] as String,
      hourlyRate: (map['hourly_rate'] as num).toDouble(),
      isOnline: (map['is_online'] as int?) == 1,
      lastHeartbeat: map['last_heartbeat'] as int?,
      currentSessionId: map['current_session_id'] as int?,
      thumbnail: map['thumbnail'] as String?,
      sessionStartTime: map['session_start_time'] as int?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'hourly_rate': hourlyRate,
      'is_online': isOnline ? 1 : 0,
      'last_heartbeat': lastHeartbeat,
      'current_session_id': currentSessionId,
      'thumbnail': thumbnail,
    };
  }

  PC copyWith({
    int? id,
    String? name,
    String? type,
    double? hourlyRate,
    bool? isOnline,
    int? lastHeartbeat,
    int? currentSessionId,
    String? thumbnail,
    int? sessionStartTime,
  }) {
    return PC(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      hourlyRate: hourlyRate ?? this.hourlyRate,
      isOnline: isOnline ?? this.isOnline,
      lastHeartbeat: lastHeartbeat ?? this.lastHeartbeat,
      currentSessionId: currentSessionId ?? this.currentSessionId,
      thumbnail: thumbnail ?? this.thumbnail,
      sessionStartTime: sessionStartTime ?? this.sessionStartTime,
    );
  }
}
