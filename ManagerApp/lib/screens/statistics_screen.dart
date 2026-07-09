import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../database/database_helper.dart';
import '../providers/statistics_provider.dart';
import '../providers/pc_provider.dart';
import '../providers/settings_provider.dart';
import '../utils.dart';

class StatisticsScreen extends StatefulWidget {
  const StatisticsScreen({super.key});

  @override
  State<StatisticsScreen> createState() => _StatisticsScreenState();
}

class _StatisticsScreenState extends State<StatisticsScreen> {
  List<Map<String, dynamic>> _chartData = [];
  int _chartDays = 7;

  @override
  void initState() {
    super.initState();
    _loadChart();
  }

  Future<void> _loadChart() async {
    final data =
        await DatabaseHelper.instance.getDailyStatisticsRange(_chartDays);
    if (mounted) setState(() => _chartData = data);
  }

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<SettingsProvider>().settings.currency;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistics'),
        actions: [
          PopupMenuButton<int>(
            onSelected: (d) {
              _chartDays = d;
              _loadChart();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 7, child: Text('7 days')),
              const PopupMenuItem(value: 30, child: Text('30 days')),
            ],
            icon: const Icon(Icons.date_range),
          ),
        ],
      ),
      body: Consumer2<StatisticsProvider, PCProvider>(
        builder: (context, statsProvider, pcProvider, child) {
          final stats = statsProvider.statistics;

          return RefreshIndicator(
            onRefresh: () async {
              await statsProvider.refreshStatistics();
              await pcProvider.refreshPCs();
              await _loadChart();
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Today's Revenue",
                            style: TextStyle(
                                color: Colors.white.withOpacity(0.9),
                                fontSize: 14)),
                        const SizedBox(height: 4),
                        Text(
                          Utils.formatCurrency(
                              stats.totalRevenue, symbol: currency),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: _miniStat(
                                'Sessions',
                                Utils.formatCurrency(stats.sessionRevenue,
                                    symbol: currency),
                              ),
                            ),
                            Expanded(
                              child: _miniStat(
                                'Snacks',
                                Utils.formatCurrency(stats.snackRevenue,
                                    symbol: currency),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  if (_chartData.isNotEmpty) ...[
                    const Text('Revenue Trend',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 200,
                      child: LineChart(
                        LineChartData(
                          gridData: const FlGridData(show: false),
                          titlesData: const FlTitlesData(show: false),
                          borderData: FlBorderData(show: false),
                          lineBarsData: [
                            LineChartBarData(
                              spots: _chartData.asMap().entries.map((e) {
                                final rev =
                                    (e.value['total_revenue'] as num?)
                                            ?.toDouble() ??
                                        0;
                                return FlSpot(e.key.toDouble(), rev);
                              }).toList(),
                              isCurved: true,
                              color: Colors.indigo,
                              barWidth: 3,
                              dotData: const FlDotData(show: true),
                              belowBarData: BarAreaData(
                                show: true,
                                color: Colors.indigo.withOpacity(0.2),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    children: [
                      _statCard('Total Hours',
                          '${stats.totalHours.toStringAsFixed(1)}h', Colors.blue),
                      _statCard('Sessions', '${stats.totalSessions}', Colors.green),
                      _statCard('Snack Orders', '${stats.totalSnackOrders}',
                          Colors.orange),
                      _statCard('Active PCs', '${stats.activePCs}', Colors.purple),
                    ],
                  ),
                  const SizedBox(height: 24),
                  _pcStatusCard(pcProvider),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _miniStat(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(),
            style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 8)),
        Text(value,
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
      ],
    );
  }

  Widget _statCard(String title, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[800],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(value,
              style: const TextStyle(
                  fontSize: 16, fontWeight: FontWeight.bold)),
          Text(title.toUpperCase(),
              style: TextStyle(color: Colors.grey[400], fontSize: 8)),
        ],
      ),
    );
  }

  Widget _pcStatusCard(PCProvider pcProvider) {
    final total = pcProvider.pcs.length;
    final online = pcProvider.onlinePCs.length;
    if (total == 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[800],
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('PC Status',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: online / total,
            backgroundColor: Colors.grey[700],
            valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
          ),
          const SizedBox(height: 8),
          Text('${((online / total) * 100).toInt()}% Online ($online/$total)',
              style: TextStyle(color: Colors.grey[400], fontSize: 12)),
        ],
      ),
    );
  }
}
