import 'package:flutter_test/flutter_test.dart';
import 'package:cyber_cafe_manager/models/cafe_settings.dart';
import 'package:cyber_cafe_manager/services/billing_service.dart';

void main() {
  group('BillingService', () {
    const settings = CafeSettings(
      offlineGraceSeconds: 300,
      minimumSessionMinutes: 15,
      billingRounding: 'none',
    );

    test('billable seconds adds offline beyond grace', () {
      final result = BillingService.billableSeconds(
        rawDurationSeconds: 3600,
        offlineDurationSeconds: 400,
        offlineGraceSeconds: 300,
      );
      expect(result, 3700);
    });

    test('offline within grace does not add time', () {
      final result = BillingService.billableSeconds(
        rawDurationSeconds: 3600,
        offlineDurationSeconds: 120,
        offlineGraceSeconds: 300,
      );
      expect(result, 3600);
    });

    test('minimum session minutes applied', () {
      final adjusted = BillingService.adjustedBillableSeconds(
        billableSeconds: 300,
        settings: settings,
      );
      expect(adjusted, 900);
    });

    test('5 minute rounding', () {
      const roundingSettings = CafeSettings(billingRounding: '5min');
      final adjusted = BillingService.adjustedBillableSeconds(
        billableSeconds: 370,
        settings: roundingSettings,
      );
      expect(adjusted, 600);
    });

    test('calculate time cost', () {
      const noMinSettings = CafeSettings(billingRounding: 'none');
      final cost = BillingService.calculateTimeCost(
        billableSeconds: 3600,
        hourlyRate: 20,
        settings: noMinSettings,
      );
      expect(cost, 20.0);
    });

    test('grand total', () {
      expect(BillingService.grandTotal(timeCost: 25, snackCost: 15), 40);
    });
  });
}
