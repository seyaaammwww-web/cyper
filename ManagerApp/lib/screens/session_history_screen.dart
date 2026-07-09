import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../database/database_helper.dart';
import '../providers/settings_provider.dart';
import '../utils.dart';

class SessionHistoryScreen extends StatefulWidget {
  const SessionHistoryScreen({super.key});

  @override
  State<SessionHistoryScreen> createState() => _SessionHistoryScreenState();
}

class _SessionHistoryScreenState extends State<SessionHistoryScreen> {
  List<Map<String, dynamic>> _sessions = [];
  bool _loading = true;
  int _days = 7;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final end = DateTime.now();
    final start = end.subtract(Duration(days: _days - 1));
    final sessions = await DatabaseHelper.instance.getSessionsByDateRange(
      start.toIso8601String().split('T')[0],
      end.toIso8601String().split('T')[0],
    );
    if (mounted) {
      setState(() {
        _sessions = sessions;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<SettingsProvider>().settings.currency;

    return Scaffold(
      appBar: AppBar(
        title: Text('SESSION LOG', style: GoogleFonts.pressStart2p(fontSize: 10)),
        actions: [
          PopupMenuButton<int>(
            onSelected: (d) {
              _days = d;
              _load();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 1, child: Text('Today')),
              const PopupMenuItem(value: 7, child: Text('7 days')),
              const PopupMenuItem(value: 30, child: Text('30 days')),
            ],
            icon: const Icon(Icons.filter_list),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _sessions.isEmpty
              ? Center(
                  child: Text(
                    'No sessions found',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _sessions.length,
                    itemBuilder: (context, i) {
                      final s = _sessions[i];
                      final duration = s['duration_seconds'] as int? ?? 0;
                      final cost = (s['time_cost'] as num?)?.toDouble() ?? 0;
                      final pcName = s['pc_name'] as String? ?? 'PC';
                      final start = DateTime.fromMillisecondsSinceEpoch(
                          (s['start_time'] as int) * 1000);

                      return Card(
                        color: Colors.grey[900],
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(
                            pcName,
                            style: GoogleFonts.pressStart2p(fontSize: 8),
                          ),
                          subtitle: Text(
                            '${start.toString().substring(0, 16)} · ${Utils.formatDuration(duration)}',
                            style: const TextStyle(fontSize: 10),
                          ),
                          trailing: Text(
                            Utils.formatCurrency(cost, symbol: currency),
                            style: const TextStyle(
                              color: Colors.greenAccent,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
