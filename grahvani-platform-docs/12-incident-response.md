# 12. Incident Response

## Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|----------|
| **P1 - Critical** | All services down, data loss risk | Immediate | PostgreSQL down, all health checks failing, data corruption |
| **P2 - Major** | Core service degraded or single service down | 30 minutes | Auth service down (blocks all logins), client-service crash |
| **P3 - Minor** | Non-critical degradation | 4 hours | Slow response times, cache miss spike, single endpoint errors |
| **P4 - Low** | Cosmetic or non-user-facing | Next business day | Logging gaps, CI flakiness, non-production issues |

---

## Diagnosis Checklist

### Step 1: Assess Scope

```bash
# Quick health check — all services
for URL in \
  "https://api-auth.grahvani.in/health" \
  "https://api-user.grahvani.in/health" \
  "https://api-client.grahvani.in/health" \
  "https://api-astro.grahvani.in/health" \
  "https://api-gateway.grahvani.in/health" \
  "https://grahvani.in/api/health"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")
  echo "$CODE $URL"
done
```

### Step 2: Check Infrastructure

```bash
# SSH to KVM4
ssh root@147.93.30.201

# Server resources
free -h              # Memory
df -h                # Disk
top -bn1 | head -20  # CPU / processes

# Docker containers
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Container resource usage
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Step 3: Check Logs

```bash
# Recent error logs per service
docker logs grahvani-auth --tail 50 2>&1 | grep -i error
docker logs grahvani-user --tail 50 2>&1 | grep -i error
docker logs grahvani-client --tail 50 2>&1 | grep -i error
docker logs grahvani-gateway --tail 50 2>&1 | grep -i error

# Or via Grafana Loki
# {job="grahvani", level="error"} in Explore view
```

### Step 4: Check Databases

```bash
# PostgreSQL
docker exec grahvani-pg psql -U grahvani -c "SELECT 1;"
docker exec grahvani-pg psql -U grahvani -c "SELECT count(*) FROM pg_stat_activity;"

# Redis
docker exec grahvani-redis redis-cli ping
docker exec grahvani-redis redis-cli info memory | grep used_memory_human
```

---

## Common Incidents and Resolution

### Service Won't Start

1. Check logs: `docker logs grahvani-<service> --tail 100`
2. Common causes:
   - Missing environment variables → check Coolify app env config
   - Database migration needed → run `npx prisma migrate deploy`
   - Port conflict → `docker ps` to find conflicting container
3. Restart: `docker restart grahvani-<service>`

### High Memory Usage

1. Check: `docker stats --no-stream`
2. If a service exceeds its limit (512MB for most), it will be OOM-killed
3. Check for memory leaks: look for steadily increasing heap in Prometheus
   - `process_resident_memory_bytes{job="grahvani"}`
4. Restart affected service: `docker restart grahvani-<service>`

### Database Connection Exhaustion

1. Check active connections: `SELECT count(*) FROM pg_stat_activity;`
2. Check per-service: `SELECT usename, count(*) FROM pg_stat_activity GROUP BY usename;`
3. If connections are exhausted, restart the affected service(s)
4. PostgreSQL max_connections default is 100

### Deployment Failure

1. Check CI logs: `gh run list -R Project-Corp-Astro/grahvani-backend -L 5`
2. View specific run: `gh run view <run-id> -R Project-Corp-Astro/grahvani-backend`
3. If smoke test fails after deploy, rollback:
   ```bash
   gh workflow run rollback.yml \
     -R Project-Corp-Astro/grahvani-backend \
     -f service=<service-name> \
     -f sha=<last-known-good-sha>
   ```

### Redis Connection Lost

1. Check Redis: `docker exec grahvani-redis redis-cli ping`
2. If down: `docker restart grahvani-redis`
3. Services will reconnect automatically (Redis clients have retry logic)
4. Cache data will be lost but will repopulate on next requests

---

## Rollback Procedure

### Via GitHub Actions (preferred)

```bash
# 1. Find the last known good SHA
gh run list -R Project-Corp-Astro/grahvani-backend -w "CI" --status success -L 5

# 2. Trigger rollback
gh workflow run rollback.yml \
  -R Project-Corp-Astro/grahvani-backend \
  -f service=auth \
  -f sha=<good-sha>
```

### Via Coolify Dashboard

1. Go to http://147.93.30.201:8000
2. Navigate to the affected app
3. Click "Restart" to rebuild from latest code
4. If needed, change the branch/commit in app settings

---

## Communication

### During an Incident

1. Acknowledge the incident within response time SLA
2. Post status update every 30 minutes for P1/P2
3. After resolution, document what happened and what was done

### Post-Incident

Create a brief post-mortem noting:
- What happened (timeline)
- Root cause
- Resolution steps taken
- What can prevent recurrence
