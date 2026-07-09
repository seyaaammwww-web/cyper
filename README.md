# Cyber Cafe Management System

A complete LAN-based cyber cafe management solution with a **Flutter Android manager app** (control center + server) and **Windows client** for each gaming PC.

## Architecture

```
[Manager Phone]  ←WiFi→  [PC-01 CafeClient]
     │ HTTP API           [PC-02 CafeClient]
     │ SQLite DB          [PC-N CafeClient]
     └── Dashboard UI
```

The manager phone runs the HTTP server and SQLite database. Windows PCs connect over local WiFi — no cloud or dedicated server required.

## Features

- **Live PC dashboard** — VIP/Premium zones, online/offline status, session timers, live cost
- **Session management** — Start/stop from manager or client; checkout receipt with time + snacks
- **Live thumbnails** — Remote screen preview from each PC
- **Snack ordering** — Customers order from tray app; staff gets push notifications
- **Customer profiles** — Prepaid balance, loyalty points, visit history, per-customer spend
- **Reservations** — Book PCs ahead with due-soon alerts on the dashboard
- **Activity log** — Full audit trail of sessions, control commands, and ops actions
- **Advanced remote control** — Lock/unlock, shutdown, restart, sleep, maintenance mode, timed shutdown with customer warning, cancel pending shutdown, on-screen messages
- **Flexible configuration** — Add/edit PCs, rates, snack menu, billing rules from Settings
- **Analytics** — Today's revenue, 7/30-day charts, session history
- **Secure LAN API** — Bearer token authentication between clients and manager

## Web Ops Console

The repository also includes a **Next.js ops console** (deployable to Vercel) backed by a **Neon Postgres** database. It mirrors and extends the manager app for browser-based operation:

- Live PC fleet dashboard with session timers, zone filters, and bulk actions
- Session start/stop with real billing (happy hour discounts, rounding rules, loyalty points)
- Snack order board with stock tracking and low-stock alerts
- Reservations, customer management (prepaid/loyalty), and settings
- Analytics: revenue trends, hourly heatmap, per-PC utilization, top snacks
- Activity feed with full audit trail

Run locally with `npm install && npm run dev` (requires `DATABASE_URL`).

## Requirements

### Manager (Android)
- Android 7.0+ phone or tablet
- Connected to cafe WiFi (same network as PCs)
- Flutter SDK 3.x for building from source

### Client (Windows)
- Windows 10/11
- .NET 8 Runtime (included in self-contained build)
- Same WiFi network as manager phone

## Quick Setup

### 1. Install Manager App
Build and install the APK on the manager phone (see [DEPLOYMENT.md](DEPLOYMENT.md)).

### 2. Connect to WiFi
Open the app on cafe WiFi. Note the **server IP:port** shown on the dashboard (e.g. `192.168.1.100:8080`).

### 3. Get API Token
Go to **Settings → Cafe** tab. Copy the **API Token**.

### 4. Install CafeClient on Each PC
1. Copy `CafeClient.exe` to each PC (or run the installer)
2. Right-click tray icon → **Settings**
3. Enter server IP, port, API token
4. Click **Fetch PCs** and select the correct PC number
5. Save

### 5. Start Operating
- Tap a PC on the dashboard → **START** to begin a session
- Customers can order snacks from the tray icon
- Tap **STOP** to end session and show checkout total

## Default Configuration

| Item | Default |
|------|---------|
| PCs | 13 (6 VIP @ 25 EGP/hr, 7 Premium @ 20 EGP/hr) |
| Server port | 8080 |
| Offline grace | 300 seconds (5 min free disconnect) |
| Currency | EGP |

All defaults are editable in Settings without recompiling.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Server won't start | Check WiFi connection; set manual IP in Settings |
| Client can't connect | Verify same WiFi; check Windows firewall allows port 8080 |
| Registration failed | Copy API token from manager Settings to client |
| PCs show offline | Ensure CafeClient is running; check heartbeat interval |
| WiFi client isolation | Disable AP isolation on router so PCs can reach phone |

## Project Structure

```
cyper/
├── ManagerApp/          # Flutter Android manager
│   ├── lib/
│   │   ├── database/    # SQLite + migrations
│   │   ├── providers/   # State management
│   │   ├── screens/     # UI screens
│   │   └── services/    # HTTP server, notifications
│   └── test/            # Unit tests
├── CafeClient/          # Windows tray client (.NET 8)
└── DEPLOYMENT.md        # Build & release guide
```

## Production Guarantee

This system is built for 24/7 cafe operation with:

- **Atomic billing** — session end is a single database transaction
- **Auto-repair** — integrity checks on every startup fix stale data
- **Command reliability** — start/stop commands persist until client confirms
- **Server watchdog** — auto-restarts if HTTP server dies
- **Rate limiting** — protects against flood/abuse on LAN
- **Price validation** — clients cannot spoof snack prices

Complete the full verification list in [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md) before going live.

## Cloud Deployment (Hugging Face Spaces)

Optional cloud backend in [`hf-space/`](hf-space/) — same API, deployable as Docker Space.


Private use for cyber cafe operations.
