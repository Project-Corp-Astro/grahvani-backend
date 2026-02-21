# 13. On-Call Guide

Quick reference for responding to Grahvani alerts and health check failures.

---

## Quick Access

| Resource | URL |
|----------|-----|
| Production | https://grahvani.in |
| Coolify Dashboard | http://147.93.30.201:8000 |
| GitHub Actions | https://github.com/Project-Corp-Astro/grahvani-backend/actions |
| KVM4 SSH | `ssh root@147.93.30.201` |

---

## Health Check Failures

The `monitor.yml` workflow runs every 15 minutes. If it fails, one or more services are unreachable.

### Auth Service Down (`api-auth.grahvani.in`)

**Impact:** All logins blocked. Existing sessions with valid tokens still work.

**First response:**
```bash
ssh root@147.93.30.201
docker logs grahvani-auth --tail 50
docker restart grahvani-auth
```

**If restart doesn't help:**
- Check PostgreSQL: `docker exec grahvani-pg psql -U grahvani -c "SELECT 1;"`
- Check Redis: `docker exec grahvani-redis redis-cli ping`
- Check env vars in Coolify dashboard

### User Service Down (`api-user.grahvani.in`)

**Impact:** User profiles, preferences, and settings unavailable. Login still works.

**First response:**
```bash
docker logs grahvani-user --tail 50
docker restart grahvani-user
```

### Client Service Down (`api-client.grahvani.in`)

**Impact:** Client CRM, chart generation, and astrology features unavailable.

**First response:**
```bash
docker logs grahvani-client --tail 50
docker restart grahvani-client
```

### Astro Engine Down (`api-astro.grahvani.in`)

**Impact:** Chart calculations fail. Cached charts still accessible from client-service database.

**First response:**
```bash
docker logs grahvani-astro-engine --tail 50
docker restart grahvani-astro-engine
```

**If external API is down:**
- Check: `curl -s https://astroengine.astrocorp.in/health`
- Astro engine will report degraded state but cached results still serve

### API Gateway Down (`api-gateway.grahvani.in`)

**Impact:** Unified API endpoint unavailable. Direct service URLs still work.

**First response:**
```bash
docker logs grahvani-gateway --tail 50
docker restart grahvani-gateway
```

### Frontend Down (`grahvani.in`)

**Impact:** Web interface completely unavailable.

**First response:**
- Check Coolify dashboard for frontend app status
- Check if it's a Cloudflare issue: `curl -I https://grahvani.in`
- Restart via Coolify or `docker restart` the frontend container

---

## Database Issues

### PostgreSQL Unresponsive

```bash
# Check container status
docker ps -f name=grahvani-pg

# Try to connect
docker exec grahvani-pg psql -U grahvani -c "SELECT 1;"

# Check connections
docker exec grahvani-pg psql -U grahvani -c "SELECT count(*) FROM pg_stat_activity;"

# If completely frozen, restart (services will reconnect)
docker restart grahvani-pg
```

### Redis Unresponsive

```bash
# Check status
docker exec grahvani-redis redis-cli ping

# Check memory
docker exec grahvani-redis redis-cli info memory

# Restart (cache data will be lost, services will rebuild cache)
docker restart grahvani-redis
```

---

## Disk Space Issues

```bash
# Check disk usage
df -h

# Docker disk usage
docker system df

# Clean up unused Docker resources (safe)
docker system prune -f

# Clean up old images (more aggressive)
docker image prune -a --filter "until=168h" -f
```

---

## Deployment Issues

### CI Pipeline Failing

```bash
# Check recent runs
gh run list -R Project-Corp-Astro/grahvani-backend -L 5

# View failed run details
gh run view <run-id> -R Project-Corp-Astro/grahvani-backend --log-failed
```

### Rollback a Bad Deploy

```bash
# Find last good SHA
gh run list -R Project-Corp-Astro/grahvani-backend -w "CI" --status success -L 5

# Execute rollback
gh workflow run rollback.yml \
  -R Project-Corp-Astro/grahvani-backend \
  -f service=<service-name> \
  -f sha=<good-sha>
```

---

## Prometheus Metrics to Watch

Check these in Grafana when investigating performance issues:

```promql
# Error rate per service (should be < 5%)
sum(rate(auth_service_http_requests_total{status_code=~"5.."}[5m]))
/ sum(rate(auth_service_http_requests_total[5m]))

# P95 latency per service (should be < 2s)
histogram_quantile(0.95, rate(auth_service_http_request_duration_seconds_bucket[5m]))

# Memory usage per service
process_resident_memory_bytes{job="grahvani"}

# Active database connections
# Check via psql if Prometheus doesn't have a PostgreSQL exporter
```

---

## Log Investigation

### Via Grafana Loki

```logql
# Recent errors
{job="grahvani", level="error"}

# Errors for specific service
{job="grahvani", service="auth", level="error"}

# Search by request ID
{job="grahvani"} | json | requestId="<request-id>"
```

### Via Docker CLI

```bash
# Follow logs in real-time
docker logs grahvani-auth -f --tail 100

# Search for errors
docker logs grahvani-auth 2>&1 | grep -i "error" | tail -20
```

---

## Escalation

| Situation | Action |
|-----------|--------|
| Single service restart fixes it | No escalation needed, document it |
| Service keeps crashing after restart | Check logs for root cause, investigate code |
| Database is down | High priority — all services depend on it |
| Server unreachable (SSH fails) | Check DigitalOcean console, may need hard reboot |
| DNS/SSL issues | Check Cloudflare dashboard |
| External Astro Engine API down | Out of our control — astro-engine degrades gracefully |
