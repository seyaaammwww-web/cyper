import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../models/pc.dart';
import '../models/snack.dart';
import '../models/snack_order.dart';
import '../providers/pc_provider.dart';
import '../providers/session_provider.dart';
import '../providers/snack_provider.dart';
import '../providers/settings_provider.dart';
import '../widgets/checkout_dialog.dart';
import '../utils.dart';

class PCDetailScreen extends StatefulWidget {
  final int pcId;

  const PCDetailScreen({super.key, required this.pcId});

  @override
  State<PCDetailScreen> createState() => _PCDetailScreenState();
}

class _PCDetailScreenState extends State<PCDetailScreen> {
  List<SnackOrder> _sessionOrders = [];
  double _sessionSnackTotal = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadOrders());
  }

  Future<void> _loadOrders() async {
    final session =
        context.read<SessionProvider>().getActiveSession(widget.pcId);
    final snackProvider = context.read<SnackProvider>();
    final orders =
        await snackProvider.getOrdersForPC(widget.pcId, session: session);
    double total = 0;
    if (session != null) {
      total = await snackProvider.calculateTotalForSession(session.id);
    }
    if (mounted) {
      setState(() {
        _sessionOrders = orders;
        _sessionSnackTotal = total;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer4<PCProvider, SessionProvider, SnackProvider,
        SettingsProvider>(
      builder: (context, pcProvider, sessionProvider, snackProvider,
          settingsProvider, child) {
        final pc = pcProvider.getPC(widget.pcId);
        final currency = settingsProvider.settings.currency;

        if (pc == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('PC Not Found')),
            body: const Center(child: Text('PC not found')),
          );
        }

        final session = sessionProvider.getActiveSession(widget.pcId);
        final duration = sessionProvider.getSessionDuration(widget.pcId);
        final currentCost =
            sessionProvider.getCurrentCost(widget.pcId, pc.hourlyRate);

        return Scaffold(
          appBar: AppBar(
            title: Text(pc.name),
            backgroundColor: pc.type == 'VIP' ? Colors.amber : Colors.indigo,
            foregroundColor: Colors.white,
            actions: [
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: pc.isOnline ? Colors.green : Colors.red,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  pc.isOnline ? 'Online' : 'Offline',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 8,
                  ),
                ),
              ),
            ],
          ),
          body: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildScreenshotSection(pc),
                _buildSessionInfo(
                    pc, duration, currentCost, sessionProvider, currency),
                _buildSessionControls(pc, session, pcProvider, snackProvider,
                    settingsProvider),
                _buildRemoteControls(pc, pcProvider),
                _buildSnackOrdersSection(snackProvider, currency),
                const SizedBox(height: 100),
              ],
            ),
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _showAddSnackDialog(context, snackProvider),
            icon: const Icon(Icons.add_shopping_cart),
            label: const Text('ADD SNACK', style: TextStyle(fontSize: 10)),
            backgroundColor: Colors.indigo,
            foregroundColor: Colors.white,
          ),
        );
      },
    );
  }

  Widget _buildScreenshotSection(PC pc) {
    return GestureDetector(
      onTap: () {
        if (pc.thumbnail != null && pc.thumbnail!.isNotEmpty) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => Scaffold(
                backgroundColor: Colors.black,
                appBar: AppBar(title: Text(pc.name)),
                body: Center(
                  child: InteractiveViewer(
                    child: Image.memory(base64Decode(pc.thumbnail!)),
                  ),
                ),
              ),
            ),
          );
        }
      },
      child: Container(
        width: double.infinity,
        height: 200,
        margin: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey[800],
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey[700]!),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: pc.thumbnail != null && pc.thumbnail!.isNotEmpty
              ? Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.memory(
                      base64Decode(pc.thumbnail!),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildNoScreenshot(),
                    ),
                    const Positioned(
                      right: 8,
                      bottom: 8,
                      child: Icon(Icons.zoom_in, color: Colors.white70),
                    ),
                  ],
                )
              : _buildNoScreenshot(),
        ),
      ),
    );
  }

  Widget _buildNoScreenshot() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.screenshot, size: 48, color: Colors.grey[600]),
          const SizedBox(height: 8),
          Text('NO SCREENSHOT',
              style: TextStyle(color: Colors.grey[600], fontSize: 8)),
        ],
      ),
    );
  }

  Widget _buildSessionInfo(PC pc, int duration, double currentCost,
      SessionProvider sessionProvider, String currency) {
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            (pc.type == 'VIP' ? Colors.amber : Colors.indigo).withOpacity(0.2),
            (pc.type == 'VIP' ? Colors.amber : Colors.indigo).withOpacity(0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: pc.type == 'VIP' ? Colors.amber : Colors.indigo,
          width: 2,
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _infoCard(
                  'Session Time',
                  sessionProvider.formatDuration(duration),
                  Icons.timer,
                ),
              ),
              Expanded(
                child: _infoCard(
                  'Current Cost',
                  Utils.formatCurrency(currentCost, symbol: currency),
                  Icons.attach_money,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _infoCard(
                  'Rate',
                  '${pc.hourlyRate.toInt()} $currency/hr',
                  Icons.payments,
                ),
              ),
              Expanded(
                child: _infoCard(
                  'Snacks',
                  Utils.formatCurrency(_sessionSnackTotal, symbol: currency),
                  Icons.fastfood,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _infoCard(String label, String value, IconData icon) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[800],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: Colors.indigo, size: 24),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: Colors.grey[400], fontSize: 7)),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSessionControls(
    PC pc,
    dynamic session,
    PCProvider pcProvider,
    SnackProvider snackProvider,
    SettingsProvider settingsProvider,
  ) {
    final hasActiveSession = session != null;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: pc.isOnline && !hasActiveSession
                  ? () => _startSession(pcProvider)
                  : null,
              icon: const Icon(Icons.play_arrow, size: 14),
              label: const Text('START', style: TextStyle(fontSize: 10)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              onPressed:
                  hasActiveSession ? () => _stopSession(pcProvider, snackProvider, settingsProvider, pc) : null,
              icon: const Icon(Icons.stop, size: 14),
              label: const Text('STOP', style: TextStyle(fontSize: 10)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRemoteControls(PC pc, PCProvider pcProvider) {
    final locked = pcProvider.isLocked(pc.id);
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'REMOTE CONTROL',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _controlChip(
                icon: locked ? Icons.lock : Icons.lock_open,
                label: locked ? 'Unlock' : 'Lock',
                color: locked ? Colors.orange : Colors.blueGrey,
                onTap: pc.isOnline
                    ? () async {
                        if (locked) {
                          await pcProvider.unlockPC(pc.id);
                        } else {
                          await pcProvider.lockPC(pc.id);
                        }
                        _toast(locked ? 'Unlock sent' : 'Lock sent');
                      }
                    : null,
              ),
              _controlChip(
                icon: Icons.message,
                label: 'Message',
                color: Colors.indigo,
                onTap: pc.isOnline ? () => _promptMessage(pc, pcProvider) : null,
              ),
              _controlChip(
                icon: Icons.bedtime,
                label: 'Sleep',
                color: Colors.teal,
                onTap: pc.isOnline
                    ? () => _confirmPower(pc, pcProvider, 'sleep')
                    : null,
              ),
              _controlChip(
                icon: Icons.restart_alt,
                label: 'Restart',
                color: Colors.amber.shade700,
                onTap: pc.isOnline
                    ? () => _confirmPower(pc, pcProvider, 'restart')
                    : null,
              ),
              _controlChip(
                icon: Icons.power_settings_new,
                label: 'Shutdown',
                color: Colors.red,
                onTap: pc.isOnline
                    ? () => _confirmPower(pc, pcProvider, 'shutdown')
                    : null,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _controlChip({
    required IconData icon,
    required String label,
    required Color color,
    VoidCallback? onTap,
  }) {
    return ElevatedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 14),
      label: Text(label, style: const TextStyle(fontSize: 10)),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      ),
    );
  }

  void _toast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), duration: const Duration(seconds: 2)),
    );
  }

  Future<void> _promptMessage(PC pc, PCProvider pcProvider) async {
    final controller = TextEditingController();
    final message = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Message to ${pc.name}'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'e.g. 5 minutes left on your session',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Send'),
          ),
        ],
      ),
    );
    if (message != null && message.isNotEmpty) {
      await pcProvider.messagePC(pc.id, message);
      _toast('Message sent to ${pc.name}');
    }
  }

  Future<void> _confirmPower(
      PC pc, PCProvider pcProvider, String action) async {
    final label = action[0].toUpperCase() + action.substring(1);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('$label ${pc.name}?'),
        content: Text('This will $action the computer immediately.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: action == 'shutdown' ? Colors.red : null,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(label),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      switch (action) {
        case 'shutdown':
          await pcProvider.shutdownPC(pc.id);
          break;
        case 'restart':
          await pcProvider.restartPC(pc.id);
          break;
        case 'sleep':
          await pcProvider.sleepPC(pc.id);
          break;
      }
      _toast('$label command sent to ${pc.name}');
    }
  }

  Widget _buildSnackOrdersSection(SnackProvider snackProvider, String currency) {
    return Container(
      margin: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('SESSION SNACKS',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              Text(
                'TOTAL: ${Utils.formatCurrency(_sessionSnackTotal, symbol: currency)}',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF4F46E5),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_sessionOrders.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.grey[800],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text('No snack orders',
                    style: TextStyle(color: Colors.grey[500])),
              ),
            )
          else
            ..._sessionOrders.map((order) => _orderTile(order, snackProvider)),
        ],
      ),
    );
  }

  Widget _orderTile(SnackOrder order, SnackProvider snackProvider) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[800],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Utils.getSnackIcon(order.snackName), color: Colors.indigo, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${order.snackName} x ${order.quantity}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10)),
                Text(order.status.toUpperCase(),
                    style: TextStyle(color: Colors.grey[400], fontSize: 9)),
              ],
            ),
          ),
          if (order.status == 'pending')
            ElevatedButton(
              onPressed: () async {
                await snackProvider.markOrderDelivered(order.id);
                await _loadOrders();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              child: const Text('DELIVER', style: TextStyle(fontSize: 8)),
            ),
        ],
      ),
    );
  }

  Future<void> _startSession(PCProvider pcProvider) async {
    try {
      await pcProvider.startSession(widget.pcId);
      await _loadOrders();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Session started')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _stopSession(
    PCProvider pcProvider,
    SnackProvider snackProvider,
    SettingsProvider settingsProvider,
    PC pc,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('CONFIRM', style: TextStyle(fontSize: 14)),
        content: const Text('STOP THIS SESSION?', style: TextStyle(fontSize: 10)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('STOP'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    final session =
        context.read<SessionProvider>().getActiveSession(widget.pcId);
    final snackCost = session != null
        ? await snackProvider.calculateTotalForSession(session.id)
        : 0.0;

    final result = await pcProvider.stopSession(widget.pcId);
    await _loadOrders();

    if (result != null && mounted) {
      HapticFeedback.mediumImpact();
      await CheckoutDialog.show(
        context,
        result: result,
        pcName: pc.name,
        snackCost: snackCost,
        currency: settingsProvider.settings.currency,
      );
    }
  }

  void _showAddSnackDialog(BuildContext context, SnackProvider snackProvider) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        expand: false,
        builder: (_, scrollController) => Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('ADD SNACK',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Expanded(
                child: GridView.builder(
                  controller: scrollController,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 1.2,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                  ),
                  itemCount: snackProvider.enabledSnacks.length,
                  itemBuilder: (_, i) {
                    final snack = snackProvider.enabledSnacks[i];
                    return InkWell(
                      onTap: () async {
                        await snackProvider.addManualOrder(
                            widget.pcId, snack.name, 1, snack.price);
                        await _loadOrders();
                        if (ctx.mounted) Navigator.pop(ctx);
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.grey[800],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Utils.getSnackIcon(snack.name),
                                color: Colors.indigo, size: 32),
                            const SizedBox(height: 8),
                            Text(snack.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 10)),
                            Text('${snack.price.toInt()} EGP',
                                style: TextStyle(
                                    color: Colors.grey[400], fontSize: 9)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
