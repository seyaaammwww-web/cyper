class Customer {
  final int id;
  final String name;
  final String? phone;
  final String? notes;
  final double prepaidBalance;
  final int loyaltyPoints;
  final double totalSpent;
  final int visitCount;

  Customer({
    required this.id,
    required this.name,
    this.phone,
    this.notes,
    this.prepaidBalance = 0,
    this.loyaltyPoints = 0,
    this.totalSpent = 0,
    this.visitCount = 0,
  });

  factory Customer.fromMap(Map<String, dynamic> map) {
    return Customer(
      id: map['id'] as int,
      name: map['name'] as String,
      phone: map['phone'] as String?,
      notes: map['notes'] as String?,
      prepaidBalance: (map['prepaid_balance'] as num?)?.toDouble() ?? 0,
      loyaltyPoints: (map['loyalty_points'] as int?) ?? 0,
      totalSpent: (map['total_spent'] as num?)?.toDouble() ?? 0,
      visitCount: (map['visit_count'] as int?) ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'phone': phone,
      'notes': notes,
      'prepaid_balance': prepaidBalance,
      'loyalty_points': loyaltyPoints,
      'total_spent': totalSpent,
      'visit_count': visitCount,
    };
  }
}
