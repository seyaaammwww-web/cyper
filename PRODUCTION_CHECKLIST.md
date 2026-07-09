# Production Guarantee Checklist

Use this before going live. Every item must pass.

## Pre-Deploy (Manager Phone)

- [ ] `flutter pub get` succeeds
- [ ] `flutter test` — all tests green
- [ ] `flutter build apk --release` succeeds
- [ ] Install APK on manager phone
- [ ] Open app → splash → dashboard shows **SERVER LIVE**
- [ ] Settings → copy **API Token**
- [ ] Note server IP:port on dashboard header
- [ ] Run integrity: Settings → Cafe → verify no errors

## Pre-Deploy (Windows PCs)

- [ ] `dotnet publish -c Release -r win-x64 --self-contained` succeeds
- [ ] Copy `CafeClient.exe` to each PC
- [ ] Configure: IP, port, API token, Fetch PCs, assign PC number
- [ ] Tray icon turns green (connected)
- [ ] Windows Firewall allows CafeClient on Private network

## Network

- [ ] Manager phone + all PCs on **same WiFi**
- [ ] Router **AP isolation disabled**
- [ ] Port 8080 reachable from PCs (test: browser `http://IP:8080/health`)

## Functional Tests (15 min)

| # | Test | Expected |
|---|------|----------|
| 1 | Start session on PC-1 | Timer runs, tile glows green |
| 2 | Stop session | Checkout dialog with correct total |
| 3 | Client disconnect 30s, reconnect | Billing includes grace adjustment |
| 4 | Order snack from client | Notification + pending order appears |
| 5 | Deliver snack | Stats update |
| 6 | Change VIP rate in Settings | New sessions use new rate |
| 7 | Add PC #14 in Settings | Appears in client Fetch PCs |
| 8 | Strict snack orders ON, order without session | Rejected |
| 9 | Kill manager app, reopen | Sessions restored, server restarts |
| 10 | PC offline 20s | Shows offline on dashboard |

## Performance Targets

| Metric | Target |
|--------|--------|
| Heartbeat response | < 100ms on LAN |
| Dashboard refresh | 60 FPS with 20 PCs |
| DB size after 30 days | < 50MB (thumbnail throttle active) |
| Server auto-recovery | < 30s after crash |

## Hugging Face Spaces (Optional Cloud)

- [ ] Create Docker Space from `hf-space/`
- [ ] Set `CAFE_API_TOKEN` secret in Space settings
- [ ] Verify `GET /health` returns JSON
- [ ] Point clients to Space URL (when using cloud mode)

## Backup

- [ ] Export SQLite weekly: `adb shell run-as com.cybercafe.manager cat databases/cyber_cafe.db > backup.db`

## Security

- [ ] API token is unique and not shared publicly
- [ ] Manager phone not exposed to public internet without VPN
- [ ] Release APK signed with your keystore (not debug)

---

**Sign-off:** When all boxes are checked, the system is production-ready.
