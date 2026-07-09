import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../database/database_helper.dart';
import '../theme/app_theme.dart';
import '../utils.dart';

class CheckoutDialog extends StatefulWidget {
  final int pcId;
  final String pcName;
  final int rawDurationSeconds;
  final int billableSeconds;
  final int offlineDurationSeconds;
  final double timeCost;
  final double snackCost;
  final String currency;

  const CheckoutDialog({
    super.key,
    required this.pcId,
    required this.pcName,
    required this.rawDurationSeconds,
    required this.billableSeconds,
    required this.offlineDurationSeconds,
    required this.timeCost,
    required this.snackCost,
    required this.currency,
  });

  static Future<void> show(
    BuildContext context, {
    required SessionEndResult result,
    required String pcName,
    required double snackCost,
    required String currency,
  }) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black87,
      transitionDuration: const Duration(milliseconds: 400),
      pageBuilder: (_, __, ___) => CheckoutDialog(
        pcId: result.pcId,
        pcName: pcName,
        rawDurationSeconds: result.rawDurationSeconds,
        billableSeconds: result.billableSeconds,
        offlineDurationSeconds: result.offlineDurationSeconds,
        timeCost: result.timeCost,
        snackCost: snackCost,
        currency: currency,
      ),
      transitionBuilder: (_, anim, __, child) {
        return ScaleTransition(
          scale: CurvedAnimation(parent: anim, curve: Curves.easeOutBack),
          child: FadeTransition(opacity: anim, child: child),
        );
      },
    );
  }

  double get grandTotal => timeCost + snackCost;

  @override
  State<CheckoutDialog> createState() => _CheckoutDialogState();
}

class _CheckoutDialogState extends State<CheckoutDialog> {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Material(
        color: Colors.transparent,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 24),
          constraints: const BoxConstraints(maxWidth: 400),
          decoration: AppTheme.glassCard(borderColor: AppColors.success.withOpacity(0.5)),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.receipt_long,
                      color: AppColors.success, size: 28),
                ),
                const SizedBox(height: 16),
                Text(
                  'SESSION COMPLETE',
                  style: GoogleFonts.spaceGrotesk(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.5,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  widget.pcName,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.primaryGlow,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 20),
                _row('Session Time', Utils.formatDuration(widget.rawDurationSeconds)),
                if (widget.billableSeconds != widget.rawDurationSeconds)
                  _row('Billable Time', Utils.formatDuration(widget.billableSeconds)),
                if (widget.offlineDurationSeconds > 0)
                  _row('Offline Grace', '+${widget.offlineDurationSeconds}s'),
                const Divider(height: 24),
                _row('Time Cost',
                    Utils.formatCurrency(widget.timeCost, symbol: widget.currency)),
                _row('Snacks',
                    Utils.formatCurrency(widget.snackCost, symbol: widget.currency)),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.success.withOpacity(0.2),
                        AppColors.primary.withOpacity(0.1),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.success.withOpacity(0.3)),
                  ),
                  child: Column(
                    children: [
                      Text('TOTAL DUE',
                          style: AppTheme.pixelLabel.copyWith(fontSize: 7)),
                      const SizedBox(height: 6),
                      Text(
                        Utils.formatCurrency(widget.grandTotal,
                            symbol: widget.currency),
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: AppColors.success,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('DONE', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
          Text(value,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }
}
