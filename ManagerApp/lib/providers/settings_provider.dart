import 'package:flutter/foundation.dart';
import '../database/database_helper.dart';
import '../models/cafe_settings.dart';

class SettingsProvider extends ChangeNotifier {
  CafeSettings _settings = const CafeSettings();
  bool _loaded = false;

  CafeSettings get settings => _settings;
  bool get loaded => _loaded;

  SettingsProvider() {
    _load();
  }

  Future<void> _load() async {
    _settings = await DatabaseHelper.instance.getSettings();
    _loaded = true;
    notifyListeners();
  }

  Future<void> refresh() async {
    await _load();
  }

  Future<void> save(CafeSettings settings) async {
    await DatabaseHelper.instance.saveSettings(settings);
    _settings = settings;
    notifyListeners();
  }

  Future<void> markOnboardingComplete() async {
    await save(_settings.copyWith(onboardingComplete: true));
  }
}
