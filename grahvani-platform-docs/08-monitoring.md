# 8. Monitoring & Health Checks

## Overview
Grahvani uses a 5-layer monitoring approach:
1. **Coolify Health Checks** — container-level, every 30 seconds
2. **GitHub Actions Health Monitor** — external endpoint checks, every 15 minutes
3. **Service-level Health** — built-in /health endpoints with detailed status
4. **Prometheus Metrics** — request duration, throughput, and error rate per service
5. **Log Aggregation (Loki + Promtail)** — centralized structured log collection with 7-day retention

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

## Layer 4: Prometheus Metrics

All 5 backend services expose a `/metrics` endpoint with Prometheus-format metrics via `prom-client`.

### Metrics Available

Each service exposes these metrics (prefixed with `{service}_`):

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_request_duration_seconds` | Histogram | method, route, status_code | Request latency distribution |
| `http_requests_total` | Counter | method, route, status_code | Total request count |
| `db_query_duration_seconds` | Histogram | operation, table | Database query latency (not on gateway) |
| `proxy_duration_seconds` | Histogram | target, status_code | Proxy latency (gateway only) |
| Default Node.js metrics | Various | — | Memory, CPU, event loop, GC |

### Service Prefixes

| Service | Prefix | Endpoint |
|---------|--------|----------|
| Auth | `auth_service_` | `https://api-auth.grahvani.in/metrics` |
| User | `user_service_` | `https://api-user.grahvani.in/metrics` |
| Client | `client_service_` | `https://api-client.grahvani.in/metrics` |
| Astro Engine | `astro_engine_` | `https://api-astro.grahvani.in/metrics` |
| API Gateway | `api_gateway_` | `https://api-gateway.grahvani.in/metrics` |

### Scraping from Prometheus

```yaml
# prometheus.yml scrape config
scrape_configs:
  - job_name: grahvani
    scrape_interval: 15s
    static_configs:
      - targets:
          - grahvani-auth:3001
          - grahvani-user:3002
          - grahvani-client:3008
          - grahvani-astro-engine:3014
          - grahvani-gateway:8080
    metrics_path: /metrics
```

---

## Layer 5: Log Aggregation (Loki + Promtail)

Centralized log collection using Grafana Loki and Promtail.

### Architecture

```
Docker containers (stdout) → Promtail → Loki → Grafana
```

### Configuration

Configuration files are in `backend/monitoring/`:
- `docker-compose.logging.yml` — Loki + Promtail containers
- `loki-config.yml` — Storage, retention (7 days), schema
- `promtail-config.yml` — Docker discovery, Pino JSON parsing

### Memory Budget

| Component | Limit |
|-----------|-------|
| Loki | 512 MB |
| Promtail | 128 MB |
| **Total** | **640 MB** |

### Querying Logs in Grafana

```logql
# All error logs across services
{job="grahvani", level="error"}

# Specific service logs
{job="grahvani", service="auth"}

# Search by request ID
{job="grahvani"} | json | requestId="uuid-here"

# Error rate per service
sum(rate({job="grahvani", level="error"}[5m])) by (service)
```

See `backend/monitoring/README.md` for full deployment and query reference.

---

## Logging

### Log Format
All services use **Pino JSON structured logging**. Console.log/error/warn have been replaced across all production code.

### Structured Fields

| Field | Description |
|-------|-------------|
| `level` | Numeric Pino level (10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal) |
| `msg` | Human-readable log message |
| `service` | Service name |
| `requestId` | Request correlation ID (from `x-request-id` header) |
| `err` | Error object (when present) |
| `time` | Unix timestamp |

### Viewing Logs

**Via Grafana + Loki** (recommended):
- Navigate to Grafana > Explore > Select Loki datasource
- Use LogQL queries (see Layer 5 section above)

**Via Coolify dashboard:**
1. Go to http://147.93.30.201:8000
2. Navigate to the app
3. Click "Logs" tab

**Via Docker CLI:**
```bash
# SSH to server first
docker logs grahvani-auth --tail 100 -f
docker logs grahvani-user --tail 100 -f
docker logs grahvani-client --tail 100 -f
docker logs grahvani-astro-engine --tail 100 -f
docker logs grahvani-gateway --tail 100 -f
```
