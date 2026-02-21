# Grahvani Monitoring Stack

Log aggregation with Loki + Promtail, integrated with Grafana.

## Components

| Component | Image | Port | Memory | Purpose |
|-----------|-------|------|--------|---------|
| Loki | grafana/loki:3.4.2 | 3100 | 512MB | Log storage and query engine |
| Promtail | grafana/promtail:3.4.2 | 9080 | 128MB | Log collector (Docker containers) |

**Total memory: ~640MB**

## Deployment on KVM4

### Option A: Docker Compose (standalone)

```bash
ssh root@147.93.30.201
cd /path/to/monitoring
docker compose -f docker-compose.logging.yml up -d
```

### Option B: Coolify

1. Create a new Docker Compose app in Coolify
2. Point it to `backend/monitoring/docker-compose.logging.yml`
3. Set resource limits (Loki: 512MB, Promtail: 128MB)
4. Ensure Promtail has access to Docker socket (`/var/run/docker.sock`)

### Network Setup

Promtail needs to be on the same Docker network as the Grahvani services to discover them. If using Coolify, add the logging services to the same network:

```bash
# Find the Coolify network for Grahvani services
docker network ls | grep grahvani

# Connect Loki and Promtail to that network
docker network connect <network-name> grahvani-loki
docker network connect <network-name> grahvani-promtail
```

## Grafana Integration

### Add Loki Datasource

1. Open Grafana at `https://grafana.grahvani.in`
2. Go to Configuration > Data Sources > Add data source
3. Select "Loki"
4. URL: `http://grahvani-loki:3100` (Docker internal) or `http://localhost:3100`
5. Click "Save & test"

Or use the provisioning file at `grafana/provisioning/datasources/loki.yml`.

### Import Dashboard

Import `grafana/dashboards/grahvani-logs.json` via Grafana UI (Dashboards > Import).

The dashboard provides:
- **Log Volume by Service** - bar chart showing log rate per service
- **Error Logs** - filtered view of error/fatal level logs
- **All Logs** - full log stream with service filter dropdown

## Log Format

All Grahvani services use Pino JSON logging. Promtail parses these fields:

| Field | Label | Description |
|-------|-------|-------------|
| `level` | Yes | Log level (trace/debug/info/warn/error/fatal) |
| `msg` | No | Log message (used as output) |
| `service` | No | Service name |
| `requestId` | No | Request correlation ID |
| `err.message` | No | Error message if present |

### Example Queries in Grafana

```logql
# All error logs
{job="grahvani"} | level="error"

# Auth service errors
{job="grahvani", service="auth"} | level="error"

# Search for specific request
{job="grahvani"} | json | requestId="abc-123"

# Rate of errors per service (last 5 min)
sum(rate({job="grahvani", level="error"}[5m])) by (service)

# Top error messages
{job="grahvani", level="error"} | json | line_format "{{.msg}}"
```

## Retention

- Log retention: **7 days** (configured in `loki-config.yml`)
- Compaction runs every 10 minutes
- Old data is deleted after a 2-hour delay

## Verification

```bash
# Check Loki is ready
curl -s http://localhost:3100/ready

# Check Promtail targets
curl -s http://localhost:9080/targets

# Query recent logs via API
curl -s "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={job="grahvani"}' \
  --data-urlencode 'limit=10' | python3 -m json.tool
```
