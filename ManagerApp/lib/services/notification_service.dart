import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final NotificationService instance = NotificationService._init();
  NotificationService._init();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings =
        AndroidInitializationSettings('@drawable/launch_background');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    await _notifications.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    _initialized = true;
  }

  void _onNotificationTapped(NotificationResponse response) {}

  Future<void> showSnackOrderNotification({
    required int pcId,
    required String snackName,
    required int quantity,
  }) async {
    await HapticFeedback.heavyImpact();

    const androidDetails = AndroidNotificationDetails(
      'snack_orders',
      'Snack Orders',
      channelDescription: 'Notifications for new snack orders',
      importance: Importance.max,
      priority: Priority.max,
      playSound: true,
      enableVibration: true,
      icon: '@drawable/launch_background',
    );

    await _notifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      'New Snack Order!',
      'PC-$pcId ordered $quantity x $snackName',
      const NotificationDetails(
        android: androidDetails,
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: 'snack_order_$pcId',
    );
  }

  Future<void> showSessionNotification({
    required int pcId,
    required String action,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'sessions',
      'Sessions',
      channelDescription: 'Notifications for session start/stop',
      importance: Importance.defaultImportance,
      icon: '@drawable/launch_background',
    );

    await _notifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      'Session $action',
      'PC-$pcId session has been $action',
      const NotificationDetails(
        android: androidDetails,
        iOS: DarwinNotificationDetails(),
      ),
      payload: 'session_$pcId',
    );
  }

  Future<void> showPCOfflineNotification({required int pcId}) async {
    const androidDetails = AndroidNotificationDetails(
      'pc_status',
      'PC Status',
      channelDescription: 'Notifications for PC status changes',
      importance: Importance.low,
      icon: '@drawable/launch_background',
    );

    await _notifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      'PC Offline',
      'PC-$pcId has gone offline',
      const NotificationDetails(
        android: androidDetails,
        iOS: DarwinNotificationDetails(),
      ),
      payload: 'pc_offline_$pcId',
    );
  }

  Future<void> cancelAll() async {
    await _notifications.cancelAll();
  }
}
