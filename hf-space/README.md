---
title: Cyber Cafe API
emoji: 🎮
colorFrom: indigo
colorTo: purple
sdk: docker
pinned: false
---

# Cyber Cafe Cloud API

API-compatible backend for Cyber Cafe Manager. Deploy to Hugging Face Spaces as a Docker Space.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CAFE_API_TOKEN` | Bearer token for clients (auto-generated if unset) |
| `CAFE_DB_PATH` | SQLite path (default `/data/cyber_cafe.db`) |
| `PORT` | Server port (default `7860` on HF) |

## Client Configuration

Point CafeClient to your Space URL:
```
server_ip=your-username-cyber-cafe.hf.space
server_port=443  # use HTTPS URL directly in future client update
api_token=YOUR_TOKEN
```

## Endpoints

Same as ManagerApp: `/health`, `/register`, `/heartbeat`, `/command`, `/order`, `/pcs`, `/snacks`
