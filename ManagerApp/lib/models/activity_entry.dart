class ActivityEntry {
  final int id;
  final int? pcId;
  final String? pcName;
  final String category;
  final String action;
  final String? detail;
  final DateTime createdAt;

  ActivityEntry({
    required this.id,
    this.pcId,
    this.pcName,
    required this.category,
    required this.action,
    this.detail,
    required this.createdAt,
  });

  factory ActivityEntry.fromMap(Map<String, dynamic> map) {
    return ActivityEntry(
      id: map['id'] as int,
      pcId: map['pc_id'] as int?,
      pcName: map['pc_name'] as String?,
      category: (map['category'] as String?) ?? 'control',
      action: map['action'] as String,
      detail: map['detail'] as String?,
      createdAt: DateTime.fromMillisecondsSinceEpoch(
          ((map['created_at'] as int?) ?? 0) * 1000),
    );
  }
}
