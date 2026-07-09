import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/reservation.dart';
import '../providers/pc_provider.dart';
import '../providers/reservation_provider.dart';
import '../theme/app_theme.dart';

class ReservationsScreen extends StatelessWidget {
  const ReservationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Reservations')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.primary,
        onPressed: () => _showAddReservationDialog(context),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: Consumer<ReservationProvider>(
        builder: (context, provider, _) {
          final upcoming = provider.upcoming;
          final past = provider.reservations
              .where((r) => r.status != 'upcoming')
              .toList();

          if (provider.reservations.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.event_available,
                      size: 48, color: AppColors.textMuted),
                  const SizedBox(height: 12),
                  Text('No reservations',
                      style: AppTheme.heading.copyWith(fontSize: 16)),
                  const SizedBox(height: 4),
                  const Text('Book a PC for a customer ahead of time',
                      style: TextStyle(
                          color: AppColors.textMuted, fontSize: 12)),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: provider.loadReservations,
            color: AppColors.primary,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                if (upcoming.isNotEmpty) ...[
                  Text('UPCOMING', style: AppTheme.pixelLabel),
                  const SizedBox(height: 10),
                  ...upcoming.map((r) => _ReservationCard(reservation: r)),
                  const SizedBox(height: 16),
                ],
                if (past.isNotEmpty) ...[
                  Text('HISTORY', style: AppTheme.pixelLabel),
                  const SizedBox(height: 10),
                  ...past.take(30).map(
                      (r) => _ReservationCard(reservation: r, readonly: true)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ReservationCard extends StatelessWidget {
  final Reservation reservation;
  final bool readonly;

  const _ReservationCard({required this.reservation, this.readonly = false});

  @override
  Widget build(BuildContext context) {
    final r = reservation;
    final borderColor = r.isOverdue
        ? AppColors.danger
        : r.isDueSoon
            ? AppColors.accent
            : null;

    final statusColor = switch (r.status) {
      'seated' => AppColors.success,
      'cancelled' => AppColors.danger,
      'no_show' => AppColors.textMuted,
      _ => r.isOverdue ? AppColors.danger : AppColors.primaryGlow,
    };

    final timeLabel =
        '${r.startAt.day}/${r.startAt.month} '
        '${r.startAt.hour.toString().padLeft(2, '0')}:${r.startAt.minute.toString().padLeft(2, '0')}';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: AppTheme.glassCard(borderColor: borderColor),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border),
            ),
            child: Text(
              r.pcName ?? 'PC ${r.pcId}',
              style: const TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 12),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(r.customerName,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14)),
                Text(
                  '$timeLabel · ${r.durationMinutes} min'
                  '${r.isOverdue ? ' · OVERDUE' : r.isDueSoon ? ' · DUE SOON' : ''}',
                  style: TextStyle(color: statusColor, fontSize: 12),
                ),
              ],
            ),
          ),
          if (!readonly && r.status == 'upcoming')
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert,
                  color: AppColors.textMuted, size: 20),
              color: AppColors.surfaceElevated,
              onSelected: (value) =>
                  context.read<ReservationProvider>().setStatus(r.id, value),
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'seated', child: Text('Mark seated')),
                PopupMenuItem(value: 'no_show', child: Text('No-show')),
                PopupMenuItem(value: 'cancelled', child: Text('Cancel')),
              ],
            )
          else
            Text(r.status.toUpperCase(),
                style: TextStyle(
                    color: statusColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

Future<void> _showAddReservationDialog(BuildContext context) async {
  final pcs = context.read<PCProvider>().pcs;
  if (pcs.isEmpty) return;

  final nameController = TextEditingController();
  int selectedPcId = pcs.first.id;
  DateTime startAt = DateTime.now().add(const Duration(hours: 1));
  int duration = 60;

  await showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setState) => AlertDialog(
        backgroundColor: AppColors.surfaceElevated,
        title: const Text('New reservation'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              autofocus: true,
              decoration: const InputDecoration(labelText: 'Customer name'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              initialValue: selectedPcId,
              dropdownColor: AppColors.surfaceElevated,
              decoration: const InputDecoration(labelText: 'PC'),
              items: pcs
                  .map((pc) => DropdownMenuItem(
                      value: pc.id, child: Text(pc.name)))
                  .toList(),
              onChanged: (v) => setState(() => selectedPcId = v ?? selectedPcId),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              initialValue: duration,
              dropdownColor: AppColors.surfaceElevated,
              decoration: const InputDecoration(labelText: 'Duration'),
              items: const [
                DropdownMenuItem(value: 30, child: Text('30 minutes')),
                DropdownMenuItem(value: 60, child: Text('1 hour')),
                DropdownMenuItem(value: 120, child: Text('2 hours')),
                DropdownMenuItem(value: 180, child: Text('3 hours')),
              ],
              onChanged: (v) => setState(() => duration = v ?? duration),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              icon: const Icon(Icons.schedule, size: 18),
              label: Text(
                '${startAt.day}/${startAt.month} '
                '${startAt.hour.toString().padLeft(2, '0')}:${startAt.minute.toString().padLeft(2, '0')}',
              ),
              onPressed: () async {
                final date = await showDatePicker(
                  context: ctx,
                  initialDate: startAt,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 30)),
                );
                if (date == null || !ctx.mounted) return;
                final time = await showTimePicker(
                  context: ctx,
                  initialTime: TimeOfDay.fromDateTime(startAt),
                );
                if (time == null) return;
                setState(() {
                  startAt = DateTime(date.year, date.month, date.day,
                      time.hour, time.minute);
                });
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final name = nameController.text.trim();
              if (name.isEmpty) return;
              await context.read<ReservationProvider>().addReservation(
                    pcId: selectedPcId,
                    customerName: name,
                    startAt: startAt,
                    durationMinutes: duration,
                  );
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Book'),
          ),
        ],
      ),
    ),
  );
}
