import 'package:flutter/material.dart';
import '../database/database_helper.dart';
import '../models/customer.dart';

class CustomerProvider extends ChangeNotifier {
  List<Customer> _customers = [];

  List<Customer> get customers => _customers;

  CustomerProvider() {
    loadCustomers();
  }

  Future<void> loadCustomers() async {
    final maps = await DatabaseHelper.instance.getAllCustomers();
    _customers = maps.map((m) => Customer.fromMap(m)).toList();
    notifyListeners();
  }

  Future<void> addCustomer(String name, {String? phone, String? notes}) async {
    await DatabaseHelper.instance.insertCustomer({
      'name': name,
      'phone': phone,
      'notes': notes,
    });
    await DatabaseHelper.instance
        .logActivity('Customer added', category: 'customer', detail: name);
    await loadCustomers();
  }

  Future<void> updateCustomer(int id,
      {String? name, String? phone, String? notes}) async {
    final values = <String, dynamic>{};
    if (name != null) values['name'] = name;
    if (phone != null) values['phone'] = phone;
    if (notes != null) values['notes'] = notes;
    if (values.isEmpty) return;
    await DatabaseHelper.instance.updateCustomer(id, values);
    await loadCustomers();
  }

  Future<void> deleteCustomer(int id) async {
    await DatabaseHelper.instance.deleteCustomer(id);
    await DatabaseHelper.instance
        .logActivity('Customer deleted', category: 'customer', detail: '#$id');
    await loadCustomers();
  }

  Future<void> topUpPrepaid(int id, double amount) async {
    if (amount <= 0) return;
    await DatabaseHelper.instance.adjustPrepaidBalance(id, amount);
    await DatabaseHelper.instance.logActivity('Prepaid top-up',
        category: 'customer', detail: 'Customer #$id +$amount');
    await loadCustomers();
  }

  Future<void> recordVisit(int id, double spent) async {
    await DatabaseHelper.instance.recordCustomerVisit(id, spent);
    await loadCustomers();
  }
}
