import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';

class Utils {
  static String formatDuration(int seconds) {
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    final secs = seconds % 60;
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  static String formatDurationReadable(int seconds) {
    if (seconds < 60) return '$seconds seconds';
    if (seconds < 3600) {
      final minutes = seconds ~/ 60;
      return '$minutes minute${minutes > 1 ? 's' : ''}';
    }
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    var result = '$hours hour${hours > 1 ? 's' : ''}';
    if (minutes > 0) {
      result += ' $minutes minute${minutes > 1 ? 's' : ''}';
    }
    return result;
  }

  static double calculateCost(int seconds, double hourlyRate) {
    return (seconds / 3600) * hourlyRate;
  }

  static String formatCurrency(double amount, {String symbol = 'EGP'}) {
    return '${amount.toStringAsFixed(2)} $symbol';
  }

  static String getTimeAgo(int timestamp) {
    final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
    final diff = now - timestamp;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return '${diff ~/ 60} min ago';
    if (diff < 86400) return '${diff ~/ 3600} hr ago';
    return '${diff ~/ 86400} days ago';
  }

  static Uint8List? decodeBase64(String? base64String) {
    if (base64String == null || base64String.isEmpty) return null;
    try {
      return base64Decode(base64String);
    } catch (_) {
      return null;
    }
  }

  static IconData getSnackIcon(String name) {
    switch (name.toLowerCase()) {
      case 'cola':
        return Icons.local_drink;
      case 'chips':
        return Icons.cookie;
      case 'coffee':
        return Icons.coffee;
      case 'water':
        return Icons.water_drop;
      case 'chocolate':
        return Icons.cake;
      case 'tea':
        return Icons.local_cafe;
      case 'juice':
        return Icons.emoji_food_beverage;
      case 'sandwich':
        return Icons.lunch_dining;
      default:
        return Icons.fastfood;
    }
  }

  static int getPCTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'vip':
        return 0xFFD97706;
      case 'premium':
        return 0xFF6366F1;
      default:
        return 0xFF6B7280;
    }
  }
}
