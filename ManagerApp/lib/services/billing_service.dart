import '../models/cafe_settings.dart';

class BillingService {
  /// Calculate billable seconds after offline grace adjustment.
  static int billableSeconds({
    required int rawDurationSeconds,
    required int offlineDurationSeconds,
    required int offlineGraceSeconds,
  }) {
    final graceApplied = offlineDurationSeconds > offlineGraceSeconds
        ? offlineDurationSeconds - offlineGraceSeconds
        : 0;
    return (rawDurationSeconds + graceApplied).clamp(0, 999999);
  }

  /// Apply minimum session and rounding rules.
  static int adjustedBillableSeconds({
    required int billableSeconds,
    required CafeSettings settings,
  }) {
    var seconds = billableSeconds;
    final minimum = settings.minimumSessionMinutes * 60;
    if (minimum > 0 && seconds > 0 && seconds < minimum) {
      seconds = minimum;
    }

    switch (settings.billingRounding) {
      case '5min':
        seconds = _roundUp(seconds, 300);
      case '15min':
        seconds = _roundUp(seconds, 900);
      default:
        break;
    }
    return seconds;
  }

  static int _roundUp(int seconds, int interval) {
    if (seconds <= 0) return 0;
    return ((seconds + interval - 1) ~/ interval) * interval;
  }

  static double calculateTimeCost({
    required int billableSeconds,
    required double hourlyRate,
    required CafeSettings settings,
  }) {
    final adjusted = adjustedBillableSeconds(
      billableSeconds: billableSeconds,
      settings: settings,
    );
    var cost = (adjusted / 3600) * hourlyRate;
    if (settings.taxPercent > 0) {
      cost *= (1 + settings.taxPercent / 100);
    }
    return cost;
  }

  static double grandTotal({
    required double timeCost,
    required double snackCost,
  }) {
    return timeCost + snackCost;
  }
}
