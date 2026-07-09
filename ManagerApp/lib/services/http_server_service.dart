import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:shelf/shelf.dart' as shelf;
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_router/shelf_router.dart';
import '../database/database_helper.dart';
import '../repositories/cafe_repository.dart';
import '../providers/pc_provider.dart';
import '../providers/snack_provider.dart';
import '../providers/session_provider.dart';
import '../providers/statistics_provider.dart';
import 'notification_service.dart';
import 'app_logger.dart';
import 'rate_limiter.dart';

class HttpServerService {
  static final HttpServerService instance = HttpServerService._init();
  HttpServerService._init();

  static const int _maxBodyBytes = 512 * 1024; // 512KB for thumbnails

  HttpServer? _server;
  String? _serverIp;
  int _port = 8080;
  bool _isRunning = false;
  String _apiToken = '';

  final Map<int, String> _thumbnailHashes = {};
  final Map<int, int> _lastThumbnailWrite = {};
  static const int _thumbnailMinIntervalSec = 10;
  final _orderLimiter = RateLimiter(maxRequests: 30, window: const Duration(minutes: 1));
  final _repo = CafeRepository.instance;

  PCProvider? _pcProvider;
  SnackProvider? _snackProvider;
  SessionProvider? _sessionProvider;
  StatisticsProvider? _statisticsProvider;

  bool get isRunning => _isRunning;
  String? get serverIp => _serverIp;
  int get port => _port;
  String get serverAddress => '$_serverIp:$_port';

  void setProviders({
    required PCProvider pcProvider,
    required SnackProvider snackProvider,
    SessionProvider? sessionProvider,
    StatisticsProvider? statisticsProvider,
  }) {
    _pcProvider = pcProvider;
    _snackProvider = snackProvider;
    _sessionProvider = sessionProvider;
    _statisticsProvider = statisticsProvider;
  }

  Future<void> startServer(String ipAddress, {int port = 8080}) async {
    if (_isRunning) await stopServer();

    _serverIp = ipAddress;
    _port = port;
    _apiToken = (await DatabaseHelper.instance.getSettings()).apiToken;

    final app = Router();
    app.post('/register', _handleRegister);
    app.post('/heartbeat', _handleHeartbeat);
    app.post('/end_session', _handleEndSession);
    app.post('/order', _handleOrder);
    app.get('/command', _handleCommand);
    app.get('/screenshot/<pcId>', _handleScreenshot);
    app.get('/health', _handleHealth);
    app.get('/pcs', _handleGetPCs);
    app.get('/snacks', _handleGetSnacks);

    final handler = const shelf.Pipeline()
        .addMiddleware(shelf.logRequests())
        .addMiddleware(_corsMiddleware)
        .addMiddleware(_authMiddleware)
        .addHandler(app.call);

    try {
      _server = await HttpServer.bind(InternetAddress.anyIPv4, _port);
      _isRunning = true;
      AppLogger.info('HTTP Server started on $serverAddress');
      shelf_io.serveRequests(_server!, handler);
    } catch (e) {
      AppLogger.error('Failed to start server', e);
      _isRunning = false;
      rethrow;
    }
  }

  shelf.Middleware get _corsMiddleware {
    return (shelf.Handler innerHandler) {
      return (shelf.Request request) async {
        if (request.method == 'OPTIONS') {
          return shelf.Response.ok('', headers: _corsHeaders);
        }
        final response = await innerHandler(request);
        return response.change(headers: _corsHeaders);
      };
    };
  }

  Map<String, String> get _corsHeaders => {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      };

  shelf.Middleware get _authMiddleware {
    return (shelf.Handler innerHandler) {
      return (shelf.Request request) async {
        if (request.url.path == 'health') {
          return innerHandler(request);
        }
        if (_apiToken.isNotEmpty) {
          final auth = request.headers['authorization'] ?? '';
          final token = auth.startsWith('Bearer ') ? auth.substring(7) : '';
          if (token != _apiToken) {
            return shelf.Response.forbidden(
              jsonEncode({'error': 'Invalid API token'}),
              headers: {'Content-Type': 'application/json'},
            );
          }
        }
        return innerHandler(request);
      };
    };
  }

  Future<void> stopServer() async {
    if (_server != null) {
      await _server!.close();
      _server = null;
      _isRunning = false;
      AppLogger.info('HTTP Server stopped');
    }
  }

  Future<void> reloadToken() async {
    _apiToken = (await DatabaseHelper.instance.getSettings()).apiToken;
  }

  Future<String> _readBody(shelf.Request request) async {
    final body = await request.readAsString();
    if (body.length > _maxBodyBytes) {
      throw const FormatException('Request body too large');
    }
    return body;
  }

  String _clientKey(shelf.Request request, int? pcId) {
    return pcId?.toString() ?? request.headers['x-forwarded-for'] ?? 'unknown';
  }

  Future<shelf.Response> _handleRegister(shelf.Request request) async {
    try {
      final data = jsonDecode(await _readBody(request)) as Map<String, dynamic>;
      final pcId = data['pc_id'] as int?;
      if (pcId == null) return _errorResponse('Missing pc_id', 400);

      final pc = await _repo.getPC(pcId);
      if (pc == null) return _errorResponse('PC not found', 404);

      await DatabaseHelper.instance.updatePC(pcId, {
        'is_online': 1,
        'last_heartbeat': DateTime.now().millisecondsSinceEpoch ~/ 1000,
      });
      _pcProvider?.refreshPCs();

      return shelf.Response.ok(
        jsonEncode({
          'status': 'registered',
          'pc_id': pcId,
          'name': pc['name'],
          'type': pc['type'],
          'hourly_rate': pc['hourly_rate'],
        }),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      return _errorResponse('Invalid request: $e', 400);
    }
  }

  Future<shelf.Response> _handleHeartbeat(shelf.Request request) async {
    try {
      final data = jsonDecode(await _readBody(request)) as Map<String, dynamic>;
      final pcId = data['pc_id'] as int?;
      if (pcId == null) return _errorResponse('Missing pc_id', 400);

      if (!_heartbeatLimiter.allow('hb_$pcId')) {
        return _errorResponse('Rate limit exceeded', 429);
      }

      if (await _repo.getPC(pcId) == null) {
        return _errorResponse('PC not found', 404);
      }

      final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
      final sessionStart = data['session_start'] as int?;
      final thumbnail = data['thumbnail'] as String?;
      final offlineDuration = data['offline_duration'] as int? ?? 0;

      final updateData = <String, dynamic>{
        'is_online': 1,
        'last_heartbeat': now,
      };
      if (thumbnail != null && thumbnail.isNotEmpty) {
        if (thumbnail.length > 400000) {
          return _errorResponse('Thumbnail too large', 413);
        }
        final nowSec = DateTime.now().millisecondsSinceEpoch ~/ 1000;
        final hash = thumbnail.hashCode.toString();
        final lastHash = _thumbnailHashes[pcId];
        final lastWrite = _lastThumbnailWrite[pcId] ?? 0;
        final shouldWrite = hash != lastHash ||
            (nowSec - lastWrite) >= _thumbnailMinIntervalSec;
        if (shouldWrite) {
          updateData['thumbnail'] = thumbnail;
          _thumbnailHashes[pcId] = hash;
          _lastThumbnailWrite[pcId] = nowSec;
        }
      }
      await DatabaseHelper.instance.updatePC(pcId, updateData);

      if (sessionStart != null) {
        await DatabaseHelper.instance.updateSessionStartTime(pcId, sessionStart);
        final pending = await DatabaseHelper.instance.peekPendingCommand(pcId);
        if (pending == 'start') {
          await _pcProvider?.acknowledgeCommand(pcId, 'start');
        }
      } else {
        final pending = await DatabaseHelper.instance.peekPendingCommand(pcId);
        if (pending == 'stop') {
          final active = await DatabaseHelper.instance.getActiveSession(pcId);
          if (active == null) {
            await _pcProvider?.acknowledgeCommand(pcId, 'stop');
          }
        }
      }
      if (offlineDuration > 0) {
        await DatabaseHelper.instance.updatePCOfflineDuration(pcId, offlineDuration);
      }

      _pcProvider?.updatePCStatus(
        pcId,
        true,
        thumbnail: thumbnail,
        offlineDuration: offlineDuration,
      );

      return shelf.Response.ok(
        jsonEncode({'status': 'acknowledged', 'timestamp': now}),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      return _errorResponse('Invalid request: $e', 400);
    }
  }

  Future<shelf.Response> _handleEndSession(shelf.Request request) async {
    try {
      final data = jsonDecode(await _readBody(request)) as Map<String, dynamic>;
      final pcId = data['pc_id'] as int?;
      if (pcId == null) return _errorResponse('Missing pc_id', 400);
      if (_pcProvider == null) return _errorResponse('PCProvider not set', 500);

      final result = await _pcProvider!.stopSession(pcId);
      await _sessionProvider?.refreshSessions();
      await _statisticsProvider?.refreshStatistics();

      if (result == null) {
        return _errorResponse('No active session', 404);
      }

      final snackCost =
          await DatabaseHelper.instance.getSnackTotalForSession(result.sessionId);

      return shelf.Response.ok(
        jsonEncode({
          'status': 'success',
          'message': 'Session ended',
          'billing': {
            'time_cost': result.timeCost,
            'snack_cost': snackCost,
            'grand_total': result.timeCost + snackCost,
            'duration_seconds': result.billableSeconds,
          },
        }),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      return _errorResponse('Invalid request: $e', 400);
    }
  }

  Future<shelf.Response> _handleOrder(shelf.Request request) async {
    try {
      final data = jsonDecode(await _readBody(request)) as Map<String, dynamic>;
      final pcId = data['pc_id'] as int?;
      final snackName = data['snack'] as String?;
      final quantity = data['quantity'] as int? ?? 1;
      final price = data['price'];

      if (pcId == null || snackName == null || price == null) {
        return _errorResponse('Missing required fields', 400);
      }

      if (!_orderLimiter.allow('order_$pcId')) {
        return _errorResponse('Rate limit exceeded', 429);
      }

      if (await _repo.getPC(pcId) == null) {
        return _errorResponse('PC not found', 404);
      }

      final settings = await _repo.getSettings();
      final validation = await _repo.validateSnackOrder(
        snackName: snackName,
        clientPrice: (price as num).toDouble(),
        quantity: quantity,
        pcId: pcId,
        settings: settings,
      );

      if (validation['valid'] != true) {
        return _errorResponse(validation['error'] as String? ?? 'Invalid order', 400);
      }

      final serverPrice = validation['price'] as double;
      final orderId = await _repo.placeSnackOrder(
        pcId: pcId,
        snackName: snackName,
        quantity: quantity,
        price: serverPrice,
      );

      await NotificationService.instance.showSnackOrderNotification(
        pcId: pcId,
        snackName: snackName,
        quantity: quantity,
      );
      _snackProvider?.refreshOrders();

      return shelf.Response.ok(
        jsonEncode({
          'status': 'ordered',
          'order_id': orderId,
          'total_price': serverPrice * quantity,
        }),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      return _errorResponse('Invalid request: $e', 400);
    }
  }

  Future<shelf.Response> _handleCommand(shelf.Request request) async {
    try {
      final pcId = int.tryParse(request.url.queryParameters['pc_id'] ?? '') ?? 0;
      if (pcId == 0) return _errorResponse('Missing pc_id', 400);

      final command = _pcProvider != null
          ? await _pcProvider!.getPendingCommand(pcId)
          : await _repo.peekPendingCommand(pcId);

      return shelf.Response.ok(
        jsonEncode({'command': command}),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      return _errorResponse('Invalid request: $e', 400);
    }
  }

  Future<shelf.Response> _handleScreenshot(
      shelf.Request request, String pcId) async {
    try {
      final pc = await _repo.getPC(int.parse(pcId));
      if (pc == null) return _errorResponse('PC not found', 404);

      final thumbnail = pc['thumbnail'] as String?;
      if (thumbnail == null || thumbnail.isEmpty) {
        return _errorResponse('No screenshot available', 404);
      }

      final bytes = base64Decode(thumbnail);
      return shelf.Response.ok(bytes, headers: {'Content-Type': 'image/jpeg'});
    } catch (e) {
      return _errorResponse('Invalid request: $e', 400);
    }
  }

  Future<shelf.Response> _handleHealth(shelf.Request request) async {
    final health = await _repo.getServerHealth();
    return shelf.Response.ok(
      jsonEncode(health),
      headers: {'Content-Type': 'application/json'},
    );
  }

  Future<shelf.Response> _handleGetPCs(shelf.Request request) async {
    try {
      final pcs = await _repo.getAllPCs();
      return shelf.Response.ok(
        jsonEncode({'pcs': pcs}),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      return _errorResponse('Invalid request: $e', 400);
    }
  }

  Future<shelf.Response> _handleGetSnacks(shelf.Request request) async {
    try {
      final snacks =
          await DatabaseHelper.instance.getAllSnacks(enabledOnly: true);
      return shelf.Response.ok(
        jsonEncode({'snacks': snacks}),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      return _errorResponse('Invalid request: $e', 400);
    }
  }

  shelf.Response _errorResponse(String message, int status) {
    return shelf.Response(
      status,
      body: jsonEncode({'error': message, 'status': status}),
      headers: {'Content-Type': 'application/json'},
    );
  }
}
