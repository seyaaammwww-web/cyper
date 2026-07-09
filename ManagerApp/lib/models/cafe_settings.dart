class CafeSettings {
  final String cafeName;
  final String currency;
  final int serverPort;
  final String apiToken;
  final int offlineGraceSeconds;
  final int minimumSessionMinutes;
  final String billingRounding;
  final double taxPercent;
  final String? manualServerIp;
  final bool onboardingComplete;
  final bool strictSnackOrders;

  const CafeSettings({
    this.cafeName = 'Cyber Cafe',
    this.currency = 'EGP',
    this.serverPort = 8080,
    this.apiToken = '',
    this.offlineGraceSeconds = 300,
    this.minimumSessionMinutes = 0,
    this.billingRounding = 'none',
    this.taxPercent = 0,
    this.manualServerIp,
    this.onboardingComplete = false,
    this.strictSnackOrders = false,
  });

  factory CafeSettings.fromMap(Map<String, dynamic> map) {
    return CafeSettings(
      cafeName: map['cafe_name'] as String? ?? 'Cyber Cafe',
      currency: map['currency'] as String? ?? 'EGP',
      serverPort: map['server_port'] as int? ?? 8080,
      apiToken: map['api_token'] as String? ?? '',
      offlineGraceSeconds: map['offline_grace_seconds'] as int? ?? 300,
      minimumSessionMinutes: map['minimum_session_minutes'] as int? ?? 0,
      billingRounding: map['billing_rounding'] as String? ?? 'none',
      taxPercent: (map['tax_percent'] as num?)?.toDouble() ?? 0,
      manualServerIp: map['manual_server_ip'] as String?,
      onboardingComplete: (map['onboarding_complete'] as int? ?? 0) == 1,
      strictSnackOrders: (map['strict_snack_orders'] as int? ?? 0) == 1,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'cafe_name': cafeName,
      'currency': currency,
      'server_port': serverPort,
      'api_token': apiToken,
      'offline_grace_seconds': offlineGraceSeconds,
      'minimum_session_minutes': minimumSessionMinutes,
      'billing_rounding': billingRounding,
      'tax_percent': taxPercent,
      'manual_server_ip': manualServerIp,
      'onboarding_complete': onboardingComplete ? 1 : 0,
      'strict_snack_orders': strictSnackOrders ? 1 : 0,
    };
  }

  CafeSettings copyWith({
    String? cafeName,
    String? currency,
    int? serverPort,
    String? apiToken,
    int? offlineGraceSeconds,
    int? minimumSessionMinutes,
    String? billingRounding,
    double? taxPercent,
    String? manualServerIp,
    bool clearManualServerIp = false,
    bool? onboardingComplete,
    bool? strictSnackOrders,
  }) {
    return CafeSettings(
      cafeName: cafeName ?? this.cafeName,
      currency: currency ?? this.currency,
      serverPort: serverPort ?? this.serverPort,
      apiToken: apiToken ?? this.apiToken,
      offlineGraceSeconds: offlineGraceSeconds ?? this.offlineGraceSeconds,
      minimumSessionMinutes:
          minimumSessionMinutes ?? this.minimumSessionMinutes,
      billingRounding: billingRounding ?? this.billingRounding,
      taxPercent: taxPercent ?? this.taxPercent,
      manualServerIp:
          clearManualServerIp ? null : (manualServerIp ?? this.manualServerIp),
      onboardingComplete: onboardingComplete ?? this.onboardingComplete,
      strictSnackOrders: strictSnackOrders ?? this.strictSnackOrders,
    );
  }
}
