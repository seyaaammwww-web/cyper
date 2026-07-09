class Snack {
  final int id;
  final String name;
  final double price;
  final bool isEnabled;

  Snack({
    required this.id,
    required this.name,
    required this.price,
    this.isEnabled = true,
  });

  factory Snack.fromMap(Map<String, dynamic> map) {
    return Snack(
      id: map['id'] as int,
      name: map['name'] as String,
      price: (map['price'] as num).toDouble(),
      isEnabled: (map['is_enabled'] as int?) != 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'is_enabled': isEnabled ? 1 : 0,
    };
  }
}
