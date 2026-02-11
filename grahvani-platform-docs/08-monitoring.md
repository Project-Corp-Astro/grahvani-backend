# 8. Monitoring & Health Checks

## Overview
Grahvani uses a 3-layer monitoring approach:
1. **Coolify Health Checks** — container-level, every 30 seconds
2. **GitHub Actions Health Monitor** — external endpoint checks, every 15 minutes
3. **Service-level Health** — built-in /health endpoints with detailed status

---

## Layer 1: Coolify Health Checks

Coolify runs Docker HEALTHCHECK on each container. If a container fails 3 consecutive checks, Coolify marks it as unhealthy and can auto-restart it.

### Configuration

| App | Health Path | Port | Interval | Timeout | Start Period | Retries |
|-----|------------|------|----------|---------|-------------|---------|
| Auth | /health | 3001 | 30s | 5s | 15s | 3 |
| User | /health | 3002 | 30s | 5s | 15s | 3 |
| Client | /health | 3008 | 30s | 5s | 15s | 3 |
| Astro Engine | /health | 3014 | 30s | 10s | 20s | 3 |
| Frontend | /api/health | 3000 | 30s | 10s | 30s | 3 |

### Check Status via Coolify API
```bash
# Set COOLIFY_TOKEN from .env file or Coolify dashboard > API tokens
TOKEN="$COOLIFY_TOKEN"

# Check all apps
for UUID in eg48400cgoc8cwocos8cosg8 jscos8kcwookg48ws8408o8g r8wwc4cggko40cs0cs8s8ogs qkgsko0kkoc004w0w04okggk lk0cksw804s4oc4c4o88ws48; do
  STATUS=$(curl -s "http://147.93.30.201:8000/api/v1/applications/$UUID" \
    -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status','?'))")
  echo "$UUID: $STATUS"
done
```

Expected output: all should show `running:healthy`

### PostgreSQL & Redis Health
```bash
# PostgreSQL
curl -s "http://147.93.30.201:8000/api/v1/databases/nwwokgkgwgg04cok0wsc408g" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status'))"

# Redis
curl -s "http://147.93.30.201:8000/api/v1/databases/eg448oos8kos08000w0k40wk" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status'))"
```

---

## Layer 2: GitHub Actions Health Monitor

**Workflow**: `backend/.github/workflows/monitor.yml`
**Schedule**: Every 15 minutes (`*/15 * * * *`) + manual dispatch
**Repo**: Project-Corp-Astro/grahvani-backend

### What It Checks
5 external endpoints via HTTPS through Cloudflare:
1. `https://api-auth.grahvani.in/health`
2. `https://api-user.grahvani.in/health`
3. `https://api-client.grahvani.in/health`
4. `https://api-astro.grahvani.in/health`
5. `https://grahvani.in/api/health`

Each check uses `curl -s -o /dev/null -w "%{http_code}" --max-time 10` and fails if non-200.

### View Monitor Results
```bash
gh run list -R Project-Corp-Astro/grahvani-backend -w monitor.yml -L 10
```

### Trigger Manual Check
```bash
gh workflow run monitor.yml -R Project-Corp-Astro/grahvani-backend
```

---

## Layer 3: Service Health Endpoints

### Auth Service: GET /health
```json
{
  "status": "ok",
  "service": "auth-service",
  "version": "1.0.0",
  "timestamp": "2026-02-11T05:23:00.507Z"
}
```

### User Service: GET /health
```json
{
  "status": "ok",
  "service": "user-service"
}
```

### Client Service: GET /health
```json
{
  "status": "ok",
  "service": "client-service"
}
```

### Astro Engine: GET /health (most detailed)
```json
{
  "status": "healthy",
  "service": "astro-engine-proxy",
  "version": "2.0.0",
  "timestamp": "2026-02-11T05:23:01.553Z",
  "uptime": 58085.02,
  "memory": {
    "rss": 108945408,
    "heapTotal": 23212032,
    "heapUsed": 17238824
  },
  "components": {
    "cache": { "status": "up", "type": "redis" },
    "externalAstroEngine": { "status": "up", "url": "https://astroengine.astrocorp.in" }
  }
}
```

Astro Engine also has:
- `GET /live` — liveness probe: `{status: "alive", timestamp}`
- `GET /ready` — readiness probe: `{status: "ready", cache: boolean}` (503 if not ready)

### Frontend: GET /api/health
```json
{
  "status": "ok",
  "service": "grahvani-frontend",
  "timestamp": "2026-02-11T05:23:02.054Z"
}
```

---

## Quick Health Check Script

```bash
#!/bin/bash
# Check all Grahvani services
echo "=== Grahvani Health Check ==="
for URL in \
  "https://api-auth.grahvani.in/health" \
  "https://api-user.grahvani.in/health" \
  "https://api-client.grahvani.in/health" \
  "https://api-astro.grahvani.in/health" \
  "https://grahvani.in/api/health"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")
  if [ "$CODE" = "200" ]; then
    echo "  ✓ $URL ($CODE)"
  else
    echo "  ✗ $URL ($CODE) ← FAILING"
  fi
done
```

---

## Database Health

### Internal Health Check (DatabaseManager)
Each database service runs `SELECT 1` every 30 seconds via the DatabaseManager singleton in `db-pro.ts`. If the query fails, the service reports unhealthy.

### Backup Monitoring
```bash
# Check latest backup status
curl -s "http://147.93.30.201:8000/api/v1/databases/nwwokgkgwgg04cok0wsc408g/backups" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  | python3 -c "
import json,sys
backups = json.load(sys.stdin)
for b in backups:
  for e in b.get('executions', [])[:3]:
    print(f\"{e['database_name']}: {e['status']} at {e['created_at']} ({e['size']} bytes)\")
"
```

---

## Logging

### Log Format
- Auth service: Pino JSON logger (structured logging)
- User/Client: Pino JSON logger
- Astro Engine: Pino with configurable LOG_LEVEL

### Viewing Logs
Currently no centralized log aggregation. View logs via Coolify dashboard:
1. Go to http://147.93.30.201:8000
2. Navigate to the app
3. Click "Logs" tab

Or via Docker:
```bash
# SSH to server first
docker logs $(docker ps -q -f name=eg48400cgoc8cwocos8cosg8) --tail 100 -f
```

---

## Alerting

### Current State
- No external alerting configured (no PagerDuty, Slack, email alerts)
- GitHub Actions monitor workflow provides visibility but no push notifications
- Coolify shows status on dashboard but doesn't send alerts

### Recommended Future Additions
1. Slack webhook on GitHub Actions monitor failure
2. Uptime monitoring (e.g., BetterUptime, UptimeRobot)
3. Sentry for error tracking (not yet configured)
4. Log aggregation (e.g., Loki, Grafana)
