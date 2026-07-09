import 'package:flutter/material.dart';
import '../models/pc.dart';
import '../theme/app_theme.dart';
import '../utils.dart';

class AnimatedPCTile extends StatefulWidget {
  final PC pc;
  final bool hasSession;
  final int duration;
  final double cost;
  final String currency;
  final VoidCallback onTap;

  const AnimatedPCTile({
    super.key,
    required this.pc,
    required this.hasSession,
    required this.duration,
    required this.cost,
    required this.currency,
    required this.onTap,
  });

  @override
  State<AnimatedPCTile> createState() => _AnimatedPCTileState();
}

class _AnimatedPCTileState extends State<AnimatedPCTile>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    if (widget.hasSession) _pulse.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(AnimatedPCTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.hasSession && !_pulse.isAnimating) {
      _pulse.repeat(reverse: true);
    } else if (!widget.hasSession && _pulse.isAnimating) {
      _pulse.stop();
      _pulse.reset();
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  Color get _borderColor {
    if (!widget.pc.isOnline) return AppColors.danger;
    if (widget.hasSession) return AppColors.success;
    return AppColors.primaryGlow;
  }

  @override
  Widget build(BuildContext context) {
    final zoneColor =
        widget.pc.type == 'VIP' ? AppColors.vip : AppColors.premium;

    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) {
        final glow = widget.hasSession ? 0.15 + _pulse.value * 0.2 : 0.08;
        return GestureDetector(
          onTap: widget.onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutCubic,
            height: 84,
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.surfaceElevated,
                  AppColors.surface.withOpacity(0.8),
                ],
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _borderColor.withOpacity(0.6 + glow),
                width: widget.hasSession ? 2 : 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: _borderColor.withOpacity(glow),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: child,
          ),
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: zoneColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: zoneColor.withOpacity(0.3)),
              ),
              child: Icon(
                Icons.monitor,
                color: _borderColor,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    children: [
                      Text(
                        widget.pc.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: zoneColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          widget.pc.type.toUpperCase(),
                          style: TextStyle(
                            fontSize: 8,
                            fontWeight: FontWeight.w600,
                            color: zoneColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  if (widget.hasSession) ...[
                    Text(
                      Utils.formatDuration(widget.duration),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.success,
                        fontWeight: FontWeight.w600,
                        fontFeatures: [FontFeature.tabularFigures()],
                      ),
                    ),
                    Text(
                      Utils.formatCurrency(widget.cost, symbol: widget.currency),
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.accent,
                      ),
                    ),
                  ] else
                    Text(
                      widget.pc.isOnline ? 'Ready' : 'Offline',
                      style: TextStyle(
                        fontSize: 11,
                        color: widget.pc.isOnline
                            ? AppColors.textMuted
                            : AppColors.danger.withOpacity(0.8),
                      ),
                    ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: AppColors.textMuted.withOpacity(0.5),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
