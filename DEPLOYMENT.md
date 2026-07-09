# Deployment Guide

## Manager App (Android)

### Debug Build
```bash
cd ManagerApp
flutter pub get
flutter build apk --debug
```
Output: `build/app/outputs/flutter-apk/app-debug.apk`

### Release Build

1. Create a keystore (one-time):
```bash
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

2. Create `android/key.properties` (do NOT commit):
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=upload
storeFile=../upload-keystore.jks
```

3. Update `android/app/build.gradle` signingConfigs (already configured for key.properties when present).

4. Build release APK:
```bash
flutter build apk --release
```
Output: `build/app/outputs/flutter-apk/app-release.apk`

### Install on Manager Phone
```bash
adb install build/app/outputs/flutter-apk/app-release.apk
```

## CafeClient (Windows)

### Publish Self-Contained EXE
```powershell
cd CafeClient
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o publish
```
Output: `CafeClient/publish/CafeClient.exe`

Or run the provided script:
```powershell
.\scripts\publish-client.ps1
```

### Client Configuration Template
Create `%APPDATA%\CafeClient\config.ini`:
```ini
server_ip=192.168.1.100
server_port=8080
pc_id=1
api_token=YOUR_TOKEN_FROM_MANAGER_SETTINGS
auto_start=true
thumbnail_quality=50
heartbeat_interval=5
```

## Network Setup

1. Connect manager phone and all PCs to the **same WiFi network**
2. Ensure router does **not** have "AP/client isolation" enabled
3. Allow inbound TCP on manager phone port **8080** (Android may prompt on first run)
4. Windows Firewall: allow `CafeClient.exe` on private networks

## Database Backup

The SQLite database is stored on the manager phone at:
```
/data/data/com.cybercafe.manager/databases/cyber_cafe.db
```

To backup (requires rooted device or adb):
```bash
adb shell run-as com.cybercafe.manager cat databases/cyber_cafe.db > backup.db
```

## Updating

### Manager App
Install new APK over existing — database migrates automatically (v1 → v2).

### CafeClient
Replace `CafeClient.exe`. Config in `%APPDATA%\CafeClient\config.ini` is preserved.

## Hugging Face Spaces (Cloud API)

For remote/cloud deployment, use the Docker API in [`hf-space/`](hf-space/):

1. Create a new **Docker Space** on Hugging Face
2. Upload contents of `hf-space/` folder
3. Set secret `CAFE_API_TOKEN` in Space settings
4. Clients connect to `https://your-space.hf.space` (HTTPS)

See [`hf-space/README.md`](hf-space/README.md) for details.

## Production Checklist

Before going live, complete every item in [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md).


| Version | Changes |
|---------|---------|
| 1.0.0 | Initial production release |
