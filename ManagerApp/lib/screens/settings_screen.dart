import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:network_info_plus/network_info_plus.dart';
import 'package:provider/provider.dart';
import '../models/cafe_settings.dart';
import '../providers/pc_provider.dart';
import '../providers/settings_provider.dart';
import '../providers/snack_provider.dart';
import '../services/http_server_service.dart';
import '../services/server_guard_service.dart';

class SettingsScreen extends StatefulWidget {
  final VoidCallback? onServerRestart;

  const SettingsScreen({super.key, this.onServerRestart});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _cafeNameCtrl = TextEditingController();
  final _currencyCtrl = TextEditingController();
  final _manualIpCtrl = TextEditingController();
  final _portCtrl = TextEditingController();
  final _graceCtrl = TextEditingController();
  final _minSessionCtrl = TextEditingController();
  final _taxCtrl = TextEditingController();
  String _rounding = 'none';
  bool _strictSnackOrders = false;

  @override
  void dispose() {
    _cafeNameCtrl.dispose();
    _currencyCtrl.dispose();
    _manualIpCtrl.dispose();
    _portCtrl.dispose();
    _graceCtrl.dispose();
    _minSessionCtrl.dispose();
    _taxCtrl.dispose();
    super.dispose();
  }

  void _loadFromSettings(CafeSettings s) {
    _cafeNameCtrl.text = s.cafeName;
    _currencyCtrl.text = s.currency;
    _manualIpCtrl.text = s.manualServerIp ?? '';
    _portCtrl.text = s.serverPort.toString();
    _graceCtrl.text = s.offlineGraceSeconds.toString();
    _minSessionCtrl.text = s.minimumSessionMinutes.toString();
    _taxCtrl.text = s.taxPercent.toString();
    _rounding = s.billingRounding;
    _strictSnackOrders = s.strictSnackOrders;
  }

  Future<void> _saveSettings() async {
    final provider = context.read<SettingsProvider>();
    final current = provider.settings;

    final updated = current.copyWith(
      cafeName: _cafeNameCtrl.text.trim(),
      currency: _currencyCtrl.text.trim(),
      manualServerIp: _manualIpCtrl.text.trim().isEmpty
          ? null
          : _manualIpCtrl.text.trim(),
      serverPort: int.tryParse(_portCtrl.text) ?? 8080,
      offlineGraceSeconds: int.tryParse(_graceCtrl.text) ?? 300,
      minimumSessionMinutes: int.tryParse(_minSessionCtrl.text) ?? 0,
      taxPercent: double.tryParse(_taxCtrl.text) ?? 0,
      billingRounding: _rounding,
      strictSnackOrders: _strictSnackOrders,
    );

    await provider.save(updated);
    context.read<PCProvider>().updateSettings(updated);
    await HttpServerService.instance.reloadToken();

    // Restart server if port/IP changed
    final ip = updated.manualServerIp ??
        await NetworkInfo().getWifiIP();
    if (ip != null) {
      await HttpServerService.instance.stopServer();
      await HttpServerService.instance.startServer(ip, port: updated.serverPort);
    }
    widget.onServerRestart?.call();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Settings saved')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final settingsProvider = context.watch<SettingsProvider>();
    if (settingsProvider.loaded && _cafeNameCtrl.text.isEmpty) {
      _loadFromSettings(settingsProvider.settings);
    }

    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: Text('SETTINGS', style: GoogleFonts.pressStart2p(fontSize: 10)),
          bottom: TabBar(
            labelStyle: GoogleFonts.pressStart2p(fontSize: 6),
            tabs: const [
              Tab(text: 'CAFE'),
              Tab(text: 'PCS'),
              Tab(text: 'SNACKS'),
              Tab(text: 'BILLING'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildCafeTab(settingsProvider.settings),
            _buildPCsTab(),
            _buildSnacksTab(),
            _buildBillingTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildCafeTab(CafeSettings settings) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _field('Cafe Name', _cafeNameCtrl),
        _field('Currency', _currencyCtrl),
        _field('Manual Server IP (optional)', _manualIpCtrl),
        _field('Server Port', _portCtrl, keyboard: TextInputType.number),
        const SizedBox(height: 12),
        ListTile(
          title: const Text('API Token', style: TextStyle(fontSize: 12)),
          subtitle: SelectableText(
            settings.apiToken,
            style: const TextStyle(fontSize: 10, color: Colors.cyanAccent),
          ),
          trailing: IconButton(
            icon: const Icon(Icons.copy),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: settings.apiToken));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Token copied')),
              );
            },
          ),
        ),
        const SizedBox(height: 24),
        ElevatedButton.icon(
          onPressed: () async {
            final report = await ServerGuardService.instance.fullSystemCheck();
            if (context.mounted) {
              final healthy = report['database']?['healthy'] == true;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(healthy
                      ? 'System healthy — server OK'
                      : 'Issues detected — data repaired automatically'),
                ),
              );
            }
          },
          icon: const Icon(Icons.health_and_safety, size: 18),
          label: const Text('Run System Check'),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          onPressed: _saveSettings,
          style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo),
          child: Text('SAVE', style: GoogleFonts.pressStart2p(fontSize: 8)),
        ),
      ],
    );
  }

  Widget _buildBillingTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _field('Offline Grace (seconds)', _graceCtrl,
            keyboard: TextInputType.number),
        _field('Minimum Session (minutes)', _minSessionCtrl,
            keyboard: TextInputType.number),
        _field('Tax %', _taxCtrl, keyboard: TextInputType.number),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: _rounding,
          decoration: const InputDecoration(labelText: 'Billing Rounding'),
          items: const [
            DropdownMenuItem(value: 'none', child: Text('None')),
            DropdownMenuItem(value: '5min', child: Text('Round up to 5 min')),
            DropdownMenuItem(value: '15min', child: Text('Round up to 15 min')),
          ],
          onChanged: (v) => setState(() => _rounding = v ?? 'none'),
        ),
        SwitchListTile(
          title: const Text('Require active session for snack orders'),
          subtitle: const Text('Clients can only order during a paid session'),
          value: _strictSnackOrders,
          onChanged: (v) => setState(() => _strictSnackOrders = v),
        ),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: _saveSettings,
          style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo),
          child: Text('SAVE', style: GoogleFonts.pressStart2p(fontSize: 8)),
        ),
      ],
    );
  }

  Widget _buildPCsTab() {
    return Consumer<PCProvider>(
      builder: (context, pcProvider, _) {
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(8),
              child: ElevatedButton.icon(
                onPressed: () => _showAddPCDialog(pcProvider),
                icon: const Icon(Icons.add, size: 16),
                label: Text('ADD PC', style: GoogleFonts.pressStart2p(fontSize: 7)),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo),
              ),
            ),
            Expanded(
              child: ListView.builder(
                itemCount: pcProvider.pcs.length,
                itemBuilder: (context, i) {
                  final pc = pcProvider.pcs[i];
                  return ListTile(
                    title: Text(pc.name, style: const TextStyle(fontSize: 12)),
                    subtitle: Text(
                      '${pc.type} · ${pc.hourlyRate.toInt()} EGP/hr',
                      style: const TextStyle(fontSize: 10),
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit, size: 18),
                          onPressed: () => _showEditPCDialog(pcProvider, pc),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                          onPressed: () async {
                            try {
                              await pcProvider.deletePC(pc.id);
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(e.toString())),
                                );
                              }
                            }
                          },
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildSnacksTab() {
    return Consumer<SnackProvider>(
      builder: (context, snackProvider, _) {
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(8),
              child: ElevatedButton.icon(
                onPressed: () => _showAddSnackDialog(snackProvider),
                icon: const Icon(Icons.add, size: 16),
                label: Text('ADD SNACK', style: GoogleFonts.pressStart2p(fontSize: 7)),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo),
              ),
            ),
            Expanded(
              child: ListView.builder(
                itemCount: snackProvider.snacks.length,
                itemBuilder: (context, i) {
                  final snack = snackProvider.snacks[i];
                  return ListTile(
                    title: Text(snack.name),
                    subtitle: Text('${snack.price.toInt()} EGP'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Switch(
                          value: snack.isEnabled,
                          onChanged: (_) => snackProvider.updateSnackItem(
                            snack.id,
                            snack.name,
                            snack.price,
                            !snack.isEnabled,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.edit, size: 18),
                          onPressed: () =>
                              _showEditSnackDialog(snackProvider, snack),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _field(String label, TextEditingController ctrl,
      {TextInputType keyboard = TextInputType.text}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: ctrl,
        keyboardType: keyboard,
        style: const TextStyle(color: Colors.white),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(fontSize: 11),
          border: const OutlineInputBorder(),
        ),
      ),
    );
  }

  void _showAddPCDialog(PCProvider provider) {
    final nameCtrl = TextEditingController();
    final rateCtrl = TextEditingController(text: '20');
    var type = 'Premium';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add PC'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
            TextField(controller: rateCtrl, decoration: const InputDecoration(labelText: 'Rate/hr'), keyboardType: TextInputType.number),
            DropdownButton<String>(
              value: type,
              isExpanded: true,
              items: const [
                DropdownMenuItem(value: 'VIP', child: Text('VIP')),
                DropdownMenuItem(value: 'Premium', child: Text('Premium')),
              ],
              onChanged: (v) => type = v ?? 'Premium',
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              await provider.addPC(
                name: nameCtrl.text.trim(),
                type: type,
                hourlyRate: double.tryParse(rateCtrl.text) ?? 20,
              );
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _showEditPCDialog(PCProvider provider, dynamic pc) {
    final nameCtrl = TextEditingController(text: pc.name);
    final rateCtrl = TextEditingController(text: pc.hourlyRate.toString());
    var type = pc.type as String;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit PC'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
            TextField(controller: rateCtrl, decoration: const InputDecoration(labelText: 'Rate/hr'), keyboardType: TextInputType.number),
            DropdownButton<String>(
              value: type,
              isExpanded: true,
              items: const [
                DropdownMenuItem(value: 'VIP', child: Text('VIP')),
                DropdownMenuItem(value: 'Premium', child: Text('Premium')),
              ],
              onChanged: (v) => type = v ?? type,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              await provider.updatePCDetails(
                pc.id as int,
                name: nameCtrl.text.trim(),
                type: type,
                hourlyRate: double.tryParse(rateCtrl.text),
              );
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showAddSnackDialog(SnackProvider provider) {
    final nameCtrl = TextEditingController();
    final priceCtrl = TextEditingController(text: '10');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Snack'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
            TextField(controller: priceCtrl, decoration: const InputDecoration(labelText: 'Price'), keyboardType: TextInputType.number),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              await provider.addSnack(
                nameCtrl.text.trim(),
                double.tryParse(priceCtrl.text) ?? 10,
              );
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _showEditSnackDialog(SnackProvider provider, dynamic snack) {
    final nameCtrl = TextEditingController(text: snack.name);
    final priceCtrl = TextEditingController(text: snack.price.toString());
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit Snack'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
            TextField(controller: priceCtrl, decoration: const InputDecoration(labelText: 'Price'), keyboardType: TextInputType.number),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              await provider.updateSnackItem(
                snack.id as int,
                nameCtrl.text.trim(),
                double.tryParse(priceCtrl.text) ?? snack.price,
                snack.isEnabled as bool,
              );
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}
