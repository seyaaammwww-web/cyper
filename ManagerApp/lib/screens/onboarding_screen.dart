import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';
import '../theme/app_theme.dart';

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsProvider>().settings;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24),
              Text(
                'Welcome to\n${settings.cafeName}',
                style: AppTheme.heading.copyWith(fontSize: 26, height: 1.2),
              ),
              const SizedBox(height: 8),
              const Text(
                'Set up your control center in 5 steps',
                style: TextStyle(color: AppColors.textMuted, fontSize: 14),
              ),
              const SizedBox(height: 32),
              _step(context, '1', 'Connect this phone to your cafe WiFi'),
              _step(context, '2', 'Note the server IP on the dashboard'),
              _step(context, '3', 'Install CafeClient on each Windows PC'),
              _step(context, '4', 'Enter IP, port, and API token in client'),
              _step(context, '5', 'Fetch PCs and assign each station'),
              const Spacer(),
              ElevatedButton(
                onPressed: () async {
                  await context.read<SettingsProvider>().markOnboardingComplete();
                  if (context.mounted) Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('Get Started',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _step(BuildContext context, String num, String text) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: AppTheme.glassCard(),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.primary, AppColors.primaryGlow],
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(num,
                style: const TextStyle(
                    fontWeight: FontWeight.w800, color: Colors.white)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(text,
                style: const TextStyle(fontSize: 13, height: 1.4)),
          ),
        ],
      ),
    );
  }
}
