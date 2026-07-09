class Statistics {
  final double totalRevenue;
  final double sessionRevenue;
  final double snackRevenue;
  final double totalHours;
  final int totalSessions;
  final int totalSnackOrders;
  final int activePCs;

  Statistics({
    this.totalRevenue = 0.0,
    this.sessionRevenue = 0.0,
    this.snackRevenue = 0.0,
    this.totalHours = 0.0,
    this.totalSessions = 0,
    this.totalSnackOrders = 0,
    this.activePCs = 0,
  });

  factory Statistics.fromMap(Map<String, dynamic> map, int activePCs) {
    return Statistics(
      totalRevenue: (map['total_revenue'] as num?)?.toDouble() ?? 0.0,
      sessionRevenue: (map['session_revenue'] as num?)?.toDouble() ?? 0.0,
      snackRevenue: (map['snack_revenue'] as num?)?.toDouble() ?? 0.0,
      totalHours: (map['total_hours'] as num?)?.toDouble() ?? 0.0,
      totalSessions: (map['total_sessions'] as int?) ?? 0,
      totalSnackOrders: (map['total_snack_orders'] as int?) ?? 0,
      activePCs: activePCs,
    );
  }
}
