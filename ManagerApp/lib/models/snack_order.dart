class SnackOrder {
  final int id;
  final int pcId;
  final int? sessionId;
  final String snackName;
  final int quantity;
  final double price;
  final double totalPrice;
  String status;
  final int timestamp;

  SnackOrder({
    required this.id,
    required this.pcId,
    this.sessionId,
    required this.snackName,
    required this.quantity,
    required this.price,
    required this.totalPrice,
    this.status = 'pending',
    required this.timestamp,
  });

  factory SnackOrder.fromMap(Map<String, dynamic> map) {
    return SnackOrder(
      id: map['id'] as int,
      pcId: map['pc_id'] as int,
      sessionId: map['session_id'] as int?,
      snackName: map['snack_name'] as String,
      quantity: map['quantity'] as int,
      price: (map['price'] as num).toDouble(),
      totalPrice: (map['total_price'] as num).toDouble(),
      status: map['status'] as String? ?? 'pending',
      timestamp: map['timestamp'] as int,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'pc_id': pcId,
      'session_id': sessionId,
      'snack_name': snackName,
      'quantity': quantity,
      'price': price,
      'total_price': totalPrice,
      'status': status,
      'timestamp': timestamp,
    };
  }

  DateTime get dateTime =>
      DateTime.fromMillisecondsSinceEpoch(timestamp * 1000);
}
