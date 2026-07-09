import 'package:flutter/material.dart';
import '../database/database_helper.dart';
import '../models/activity_entry.dart';
import '../theme/app_theme.dart';

class ActivityLogScreen extends StatefulWidget {
  const ActivityLogScreen({super.key});

  @override
  State<ActivityLogScreen> createState() => _ActivityLogScreenState();
}

class _ActivityLogScreenState extends State<ActivityLogScreen> {
  List<ActivityEntry> _entries = [];
  String _filter = '';
  bool _loading = true;

  static const _categories = <String, String>{
    '': 'All',
    'control': 'Control',
    'session': 'Sessions',
    'reservation': 'Reservations',
    'customer': 'Customers',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final maps = await DatabaseHelper.instance
        .getActivityLog(category: _filter.isEmpty ? null : _filter);
    if (!mounted) return;
    setState(() {
      _entries = maps.map((m) => ActivityEntry.fromMap(m)).toList();
      _loading = false;
    });
  }

  Color _categoryColor(String category) {
    return switch (category) {
      'session' => AppColors.success,
      'reservation' => AppColors.accent,
      'customer' => AppColors.primaryGlow,
      _ => AppColors.textMuted,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Activity Log')),
      body: Column(
        children: [
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: _categories.entries.map((e) {
                final selected = _filter == e.key;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(e.value),
                    selected: selected,
                    selectedColor: AppColors.primary.withOpacity(0.3),
                    backgroundColor: AppColors.surface,
                    labelStyle: TextStyle(
                      fontSize: 12,
                      color: selected
                          ? AppColors.textPrimary
                          : AppColors.textMuted,
                    ),
                    onSelected: (_) {
                      setState(() => _filter = e.key);
                      _load();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(
                        color: AppColors.primary))
                : _entries.isEmpty
                    ? const Center(
                        child: Text('No activity recorded yet',
                            style: TextStyle(color: AppColors.textMuted)))
                    : RefreshIndicator(
                        onRefresh: _load,
                        color: AppColors.primary,
                        child: ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(16),
                          itemCount: _entries.length,
                          itemBuilder: (context, index) {
                            final entry = _entries[index];
                            final color = _categoryColor(entry.category);
                            final t = entry.createdAt;
                            final timeLabel =
                                '${t.day}/${t.month} ${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(12),
                                border:
                                    Border.all(color: AppColors.border),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      color: color,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${entry.action}'
                                          '${entry.pcName != null ? ' · ${entry.pcName}' : ''}',
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w600,
                                              fontSize: 13),
                                        ),
                                        if (entry.detail?.isNotEmpty == true)
                                          Text(entry.detail!,
                                              style: const TextStyle(
                                                  color:
                                                      AppColors.textMuted,
                                                  fontSize: 11)),
                                      ],
                                    ),
                                  ),
                                  Text(timeLabel,
                                      style: const TextStyle(
                                          color: AppColors.textMuted,
                                          fontSize: 11)),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
