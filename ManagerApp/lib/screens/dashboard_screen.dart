import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:network_info_plus/network_info_plus.dart';
import 'package:provider/provider.dart';
import '../models/pc.dart';
import '../providers/pc_provider.dart';
import '../providers/session_provider.dart';
import '../providers/snack_provider.dart';
import '../providers/statistics_provider.dart';
import '../providers/settings_provider.dart';
import '../services/http_server_service.dart';
import '../services/server_guard_service.dart';
import '../widgets/status_header.dart';
import '../widgets/animated_pc_tile.dart';
import '../widgets/shimmer_loading.dart';
import '../theme/app_theme.dart';
import 'pc_detail_screen.dart';
import 'snack_orders_screen.dart';
import 'statistics_screen.dart';
import 'settings_screen.dart';
import 'session_history_screen.dart';
import 'onboarding_screen.dart';
import 'customers_screen.dart';
import 'reservations_screen.dart';
import 'activity_log_screen.dart';
import '../providers/reservation_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => DashboardScreenState();
}

class DashboardScreenState extends State<DashboardScreen> {
  String? serverIp;
  bool serverStarted = false;
  String? serverError;
  int _selectedTabIndex = 0;
  StreamSubscription<ConnectivityResult>? _connectivitySub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
    _connectivitySub =
        Connectivity().onConnectivityChanged.listen((_) => _initServer());
  }

  Future<void> _bootstrap() async {
    final settings = context.read<SettingsProvider>().settings;
    if (!settings.onboardingComplete && mounted) {
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const OnboardingScreen()),
      );
    }
    await _wireProviders();
    await _initServer();
  }

  Future<void> _wireProviders() async {
    final pc = context.read<PCProvider>();
    final session = context.read<SessionProvider>();
    final snack = context.read<SnackProvider>();
    final stats = context.read<StatisticsProvider>();
    final settings = context.read<SettingsProvider>();

    pc.setDependencies(
      sessionProvider: session,
      statisticsProvider: stats,
      settings: settings.settings,
    );
    snack.setStatisticsProvider(stats);

    final server = HttpServerService.instance;
    server.setProviders(
      pcProvider: pc,
      snackProvider: snack,
      sessionProvider: session,
      statisticsProvider: stats,
    );
    stats.setPCProvider(pc);
  }

  Future<void> _initServer() async {
    if (!mounted) return;
    final settings = context.read<SettingsProvider>().settings;
    final info = NetworkInfo();
    final wifiIP = await info.getWifiIP();
    final ip = settings.manualServerIp?.isNotEmpty == true
        ? settings.manualServerIp
        : wifiIP;

    if (!mounted) return;

    if (ip == null || ip.isEmpty) {
      setState(() {
        serverIp = null;
        serverStarted = false;
        serverError = 'No network IP. Set manual IP in Settings.';
      });
      return;
    }

    try {
      final server = HttpServerService.instance;
      await server.startServer(ip, port: settings.serverPort);
      ServerGuardService.instance.start(ip: ip, port: settings.serverPort);
      if (mounted) {
        setState(() {
          serverIp = ip;
          serverStarted = true;
          serverError = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          serverIp = ip;
          serverStarted = false;
          serverError = 'Server failed: $e';
        });
      }
    }
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedTabIndex,
        children: [
          _DashboardTab(
            serverIp: serverIp,
            serverStarted: serverStarted,
            serverError: serverError,
            onRefresh: _initServer,
          ),
          const SnackOrdersScreen(),
          const StatisticsScreen(),
          const SessionHistoryScreen(),
          SettingsScreen(onServerRestart: _initServer),
        ],
      ),
      bottomNavigationBar: _buildPixelNavBar(),
    );
  }

  Widget _buildPixelNavBar() {
    return Container(
      height: 68,
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(top: BorderSide(color: AppColors.border)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          _buildNavItem(Icons.grid_view_rounded, 'Dash', 0),
          _buildNavItem(Icons.restaurant_menu, 'Orders', 1),
          _buildNavItem(Icons.insights, 'Stats', 2),
          _buildNavItem(Icons.history, 'Logs', 3),
          _buildNavItem(Icons.tune, 'Setup', 4),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final selected = _selectedTabIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedTabIndex = index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(
                color: selected ? AppColors.primary : Colors.transparent,
                width: 3,
              ),
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                color: selected ? AppColors.primaryGlow : AppColors.textMuted,
                size: 22,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: selected ? AppColors.textPrimary : AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DashboardTab extends StatelessWidget {
  final String? serverIp;
  final bool serverStarted;
  final String? serverError;
  final VoidCallback onRefresh;

  const _DashboardTab({
    this.serverIp,
    this.serverStarted = false,
    this.serverError,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsProvider>().settings;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(settings.cafeName),
        actions: [
          Consumer<ReservationProvider>(
            builder: (context, reservations, _) => IconButton(
              tooltip: 'Reservations',
              icon: Badge(
                isLabelVisible: reservations.dueSoonCount > 0,
                label: Text('${reservations.dueSoonCount}'),
                backgroundColor: AppColors.danger,
                child: const Icon(Icons.event_available),
              ),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ReservationsScreen()),
              ),
            ),
          ),
          IconButton(
            tooltip: 'Customers',
            icon: const Icon(Icons.people_outline),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CustomersScreen()),
            ),
          ),
          IconButton(
            tooltip: 'Activity log',
            icon: const Icon(Icons.receipt_long),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ActivityLogScreen()),
            ),
          ),
          IconButton(
            tooltip: 'Lock all online PCs',
            icon: const Icon(Icons.lock_outline),
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Lock all PCs?'),
                  content: const Text(
                      'This locks every online computer immediately (e.g. closing time).'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Cancel'),
                    ),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('Lock all'),
                    ),
                  ],
                ),
              );
              if (confirmed == true && context.mounted) {
                await context.read<PCProvider>().lockAll();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Lock sent to all online PCs')),
                  );
                }
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          StatusHeader(
            serverOnline: serverStarted,
            serverAddress: serverIp != null
                ? '$serverIp:${settings.serverPort}'
                : null,
          ),
          if (serverError != null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.danger.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.danger.withOpacity(0.4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber, color: AppColors.danger, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(serverError!,
                        style: const TextStyle(fontSize: 12)),
                  ),
                  TextButton(
                    onPressed: onRefresh,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          Expanded(
            child: Consumer2<PCProvider, SessionProvider>(
              builder: (context, pcProvider, sessionProvider, _) {
                if (pcProvider.pcs.isEmpty) {
                  return const DashboardSkeleton();
                }
                return RefreshIndicator(
                  onRefresh: () async {
                    await pcProvider.refreshPCs();
                    await sessionProvider.refreshSessions();
                    onRefresh();
                  },
                  color: AppColors.primary,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            children: [
                              _sectionLabel('Premium', AppColors.premium),
                              const SizedBox(height: 10),
                              ...pcProvider.premiumPCs.map(
                                (pc) => _pcTile(pc, sessionProvider, context),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            children: [
                              _sectionLabel('VIP', AppColors.vip),
                              const SizedBox(height: 10),
                              ...pcProvider.vipPCs.map(
                                (pc) => _pcTile(pc, sessionProvider, context),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(String title, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withOpacity(0.25), color.withOpacity(0.08)],
        ),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.5,
          color: color,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }

  Widget _pcTile(PC pc, SessionProvider sessionProvider, BuildContext context) {
    final hasSession = sessionProvider.getActiveSession(pc.id) != null;
    final duration = sessionProvider.getSessionDuration(pc.id);
    final cost = sessionProvider.getCurrentCost(pc.id, pc.hourlyRate);
    final settings = context.read<SettingsProvider>().settings;

    return AnimatedPCTile(
      pc: pc,
      hasSession: hasSession,
      duration: duration,
      cost: cost,
      currency: settings.currency,
      onTap: () => Navigator.push(
        context,
        PageRouteBuilder(
          pageBuilder: (_, __, ___) => PCDetailScreen(pcId: pc.id),
          transitionsBuilder: (_, anim, __, child) =>
              FadeTransition(opacity: anim, child: child),
        ),
      ),
    );
  }
}
