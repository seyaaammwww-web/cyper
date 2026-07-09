import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/customer.dart';
import '../providers/customer_provider.dart';
import '../providers/settings_provider.dart';
import '../theme/app_theme.dart';

class CustomersScreen extends StatelessWidget {
  const CustomersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<SettingsProvider>().settings.currency;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Customers')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.primary,
        onPressed: () => _showCustomerDialog(context),
        child: const Icon(Icons.person_add, color: Colors.white),
      ),
      body: Consumer<CustomerProvider>(
        builder: (context, provider, _) {
          if (provider.customers.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.people_outline,
                      size: 48, color: AppColors.textMuted),
                  const SizedBox(height: 12),
                  Text('No customers yet',
                      style: AppTheme.heading.copyWith(fontSize: 16)),
                  const SizedBox(height: 4),
                  const Text('Add regulars to track spend and loyalty',
                      style: TextStyle(
                          color: AppColors.textMuted, fontSize: 12)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: provider.loadCustomers,
            color: AppColors.primary,
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: provider.customers.length,
              itemBuilder: (context, index) {
                final c = provider.customers[index];
                return _CustomerCard(customer: c, currency: currency);
              },
            ),
          );
        },
      ),
    );
  }
}

class _CustomerCard extends StatelessWidget {
  final Customer customer;
  final String currency;

  const _CustomerCard({required this.customer, required this.currency});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: AppTheme.glassCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: AppColors.primary.withOpacity(0.2),
                child: Text(
                  customer.name.isNotEmpty
                      ? customer.name[0].toUpperCase()
                      : '?',
                  style: const TextStyle(
                      color: AppColors.primaryGlow,
                      fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(customer.name,
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 15)),
                    if (customer.phone?.isNotEmpty == true)
                      Text(customer.phone!,
                          style: const TextStyle(
                              color: AppColors.textMuted, fontSize: 12)),
                  ],
                ),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert,
                    color: AppColors.textMuted, size: 20),
                color: AppColors.surfaceElevated,
                onSelected: (value) {
                  final provider = context.read<CustomerProvider>();
                  switch (value) {
                    case 'topup':
                      _showTopUpDialog(context, customer);
                    case 'edit':
                      _showCustomerDialog(context, customer: customer);
                    case 'delete':
                      provider.deleteCustomer(customer.id);
                  }
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'topup', child: Text('Top up prepaid')),
                  PopupMenuItem(value: 'edit', child: Text('Edit')),
                  PopupMenuItem(value: 'delete', child: Text('Delete')),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _stat('PREPAID',
                  '${customer.prepaidBalance.toStringAsFixed(0)} $currency',
                  AppColors.success),
              _stat('POINTS', '${customer.loyaltyPoints}', AppColors.accent),
              _stat('SPENT',
                  '${customer.totalSpent.toStringAsFixed(0)} $currency',
                  AppColors.primaryGlow),
              _stat('VISITS', '${customer.visitCount}', AppColors.textMuted),
            ],
          ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value, Color color) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppTheme.pixelLabel),
          const SizedBox(height: 4),
          Text(value,
              style: TextStyle(
                  color: color, fontWeight: FontWeight.w700, fontSize: 13)),
        ],
      ),
    );
  }
}

Future<void> _showCustomerDialog(BuildContext context,
    {Customer? customer}) async {
  final nameController = TextEditingController(text: customer?.name ?? '');
  final phoneController = TextEditingController(text: customer?.phone ?? '');
  final notesController = TextEditingController(text: customer?.notes ?? '');

  await showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppColors.surfaceElevated,
      title: Text(customer == null ? 'Add customer' : 'Edit customer'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: nameController,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: phoneController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Phone (optional)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: notesController,
            decoration: const InputDecoration(labelText: 'Notes (optional)'),
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
            final provider = context.read<CustomerProvider>();
            if (customer == null) {
              await provider.addCustomer(name,
                  phone: phoneController.text.trim(),
                  notes: notesController.text.trim());
            } else {
              await provider.updateCustomer(customer.id,
                  name: name,
                  phone: phoneController.text.trim(),
                  notes: notesController.text.trim());
            }
            if (ctx.mounted) Navigator.pop(ctx);
          },
          child: const Text('Save'),
        ),
      ],
    ),
  );
}

Future<void> _showTopUpDialog(BuildContext context, Customer customer) async {
  final amountController = TextEditingController();

  await showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppColors.surfaceElevated,
      title: Text('Top up ${customer.name}'),
      content: TextField(
        controller: amountController,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        autofocus: true,
        decoration: const InputDecoration(labelText: 'Amount'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () async {
            final amount = double.tryParse(amountController.text.trim());
            if (amount == null || amount <= 0) return;
            await context
                .read<CustomerProvider>()
                .topUpPrepaid(customer.id, amount);
            if (ctx.mounted) Navigator.pop(ctx);
          },
          child: const Text('Top up'),
        ),
      ],
    ),
  );
}
