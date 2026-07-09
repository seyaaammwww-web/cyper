import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/pc_provider.dart';
import '../providers/statistics_provider.dart';
import '../providers/snack_provider.dart';
import '../providers/settings_provider.dart';
import '../theme/app_theme.dart';
import '../utils.dart';

class StatusHeader extends StatelessWidget {
  final bool serverOnline;
  final String? serverAddress;

  const StatusHeader({
    super.key,
    required this.serverOnline,
    this.serverAddress,
  });

  @override
  Widget build(BuildContext context) {
    final stats = context.watch<StatisticsProvider>().statistics;
    final pcProvider = context.watch<PCProvider>();
    final snackProvider = context.watch<SnackProvider>();
    final currency = context.watch<SettingsProvider>().settings.currency;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: AppTheme.glassCard(
        borderColor: serverOnline
            ? AppColors.success.withOpacity(0.4)
            : AppColors.danger.withOpacity(0.4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _pulseDot(serverOnline),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  serverOnline ? 'SERVER LIVE' : 'SERVER OFFLINE',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                    color: serverOnline ? AppColors.success : AppColors.danger,
                  ),
                ),
              ),
              if (serverAddress != null)
                Text(
                  serverAddress!,
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.textMuted,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _stat(
                'REVENUE',
                Utils.formatCurrency(stats.totalRevenue, symbol: currency),
                AppColors.primaryGlow,
              ),
              _stat(
                'ONLINE',
                '${pcProvider.onlinePCs.length}/${pcProvider.pcs.length}',
                AppColors.success,
              ),
              _stat(
                'ACTIVE',
                '${pcProvider.activePCs.length}',
                AppColors.accent,
              ),
              _stat(
                'ORDERS',
                '${snackProvider.pendingCount}',
                snackProvider.pendingCount > 0
                    ? AppColors.danger
                    : AppColors.textMuted,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _pulseDot(bool online) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.6, end: 1),
      duration: const Duration(milliseconds: 900),
      curve: Curves.easeInOut,
      builder: (context, value, child) {
        return Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: (online ? AppColors.success : AppColors.danger)
                .withOpacity(value),
            boxShadow: online
                ? [
                    BoxShadow(
                      color: AppColors.success.withOpacity(0.5 * value),
                      blurRadius: 8,
                      spreadRadius: 2,
                    ),
                  ]
                : null,
          ),
        );
      },
      onEnd: () {},
    );
  }

  Widget _stat(String label, String value, Color color) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTheme.pixelLabel.copyWith(fontSize: 6),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: color,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
