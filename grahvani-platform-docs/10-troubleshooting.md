# 10. Troubleshooting

## Common Issues & Fixes

---

### Service Won't Start Locally

**Symptom**: `npm run dev` fails or service crashes on startup.

**Check 1: Prisma client not generated**
```
Error: @prisma/client did not initialize yet
Error: Cannot find module '../src/generated/prisma'
```
Fix:
```bash
npm run prisma:generate
```

**Check 2: Missing .env file**
```
Error: DATABASE_URL not configured in environment
```
Fix: Copy the master .env to the backend root:
```bash
cp /path/to/master/.env ./grahvani-backend/.env
```

**Check 3: Redis not running**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
Fix:
```bash
docker compose up -d
```

**Check 4: Port already in use**
```
Error: listen EADDRINUSE :::3001
```
Fix: Kill the process using the port:
```bash
lsof -ti:3001 | xargs kill -9
```

---

### Build Fails in CI / Coolify

**Symptom**: Docker build fails during CI deploy or Coolify rebuild.

**Check 1: `tsc: not found` in Docker build**
- Cause: `NODE_ENV=production` set as a **build-time** env var in Coolify
- When `NODE_ENV=production`, `npm ci` skips devDependencies (which includes `typescript`)
- Fix: Set `NODE_ENV=production` as runtime-only (`is_buildtime: false`) in Coolify

**Check 2: bcrypt native module error (auth-service only)**
```
Error: Cannot find module 'bcrypt'
Error: bcrypt_napi.node: invalid ELF header
```
- Cause: bcrypt has native C++ bindings that must be compiled for the target platform
- Fix: Ensure `Dockerfile.auth` includes `npm rebuild bcrypt` in the deps stage

**Check 3: Prisma binary target mismatch**
```
Error: Query engine library for current platform "linux-musl" could not be found
```
- Cause: Missing binary target in Prisma schema
- Fix: Ensure schema has: `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]`

**Check 4: Out of memory during build**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```
- Fix: Increase memory limit in Coolify for the app, or add `NODE_OPTIONS=--max-old-space-size=4096` as a build-time env var

---

### Service Unhealthy in Coolify

**Symptom**: Coolify shows `running:unhealthy` or container keeps restarting.

**Step 1: Check health endpoint directly**
```bash
curl -s https://api-auth.grahvani.in/health | jq .
```

**Step 2: Check Coolify logs**
Go to Coolify dashboard > Application > Logs tab. Or via Docker:
```bash
# SSH to 147.93.30.201, then:
docker logs $(docker ps -q -f name=eg48400cgoc8cwocos8cosg8) --tail 50
```

**Step 3: Check if it's an OOM kill**
```bash
docker inspect $(docker ps -q -f name=eg48400cgoc8cwocos8cosg8) | grep -A5 OOMKilled
```
If `OOMKilled: true`, increase memory limit:
```bash
curl -X PATCH "http://147.93.30.201:8000/api/v1/applications/eg48400cgoc8cwocos8cosg8" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limits_memory": "768m"}'
```
Then restart the app.

**Step 4: Check if database is reachable**
If the service logs show Prisma connection errors:
```bash
# Check PostgreSQL status
curl -s "http://147.93.30.201:8000/api/v1/databases/nwwokgkgwgg04cok0wsc408g" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status'))"
```
If PostgreSQL is down, restart it:
```bash
curl -X POST "http://147.93.30.201:8000/api/v1/databases/nwwokgkgwgg04cok0wsc408g/restart" \
  -H "Authorization: Bearer $COOLIFY_TOKEN"
```

---

### Login Returns 401

**Symptom**: POST /api/v1/auth/login returns 401 Unauthorized.

**Check 1: User doesn't exist**
- The user may not be registered. Register first:
```bash
curl -X POST https://api-auth.grahvani.in/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass@123","name":"Test User"}'
```

**Check 2: Wrong password**
- Passwords are bcrypt-hashed. There's no way to recover them.
- Reset by updating directly in the database (not recommended) or implement password reset flow.

**Check 3: Account status**
- Accounts start as `pending_verification`. Login may fail if the service enforces verification.
- Check account status in Prisma Studio:
```bash
npx prisma studio --schema=services/auth-service/prisma/schema.prisma
# Look at auth_users table, check 'status' column
```

**Check 4: Rate limiting**
- Auth service rate-limits to 50 attempts per 15 min per email:IP
- If rate limited, wait 15 minutes or check Redis for rate limit keys

---

### Database Connection Errors

**Symptom**: Services can't connect to PostgreSQL.

**Check 1: PostgreSQL container is down**
```bash
curl -s "http://147.93.30.201:8000/api/v1/databases/nwwokgkgwgg04cok0wsc408g" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status'))"
```
Fix: Restart PostgreSQL via Coolify API.

**Check 2: Wrong DATABASE_URL**
- Production services use Docker internal hostname: `nwwokgkgwgg04cok0wsc408g`
- Local dev uses: `localhost:5432` (or `localhost:5433` for SSH tunnel)
- Never mix production and local hostnames

**Check 3: Connection limits exhausted**
- Each service creates a Prisma connection pool
- Default pool size in dev: 5 connections per service
- Check with: `SELECT count(*) FROM pg_stat_activity WHERE datname = 'grahvani';`

**Check 4: Schema not found**
```
Error: relation "auth_users" does not exist
```
- Cause: The service-specific URL should include `?search_path=app_auth,public`
- Or the schema hasn't been pushed: `npx prisma db push --schema=...`

---

### Prisma Migration Issues

**Can't run migrations locally against production**
```
Error: P3014 Prisma Migrate could not create the shadow database
```
- Prisma needs a shadow database for `migrate dev`. Production DBs often don't allow creating databases.
- Fix: Use `prisma db push` instead (no shadow database needed), or run against a local PostgreSQL.

**Migration drift detected**
```
Error: P3005 The database schema is not empty
```
- The database has tables that don't match the migration history.
- Fix: `npx prisma migrate resolve --applied <migration_name>` to mark it as applied.

**Prisma CLI uses wrong database**
- Prisma CLI reads `DATABASE_URL` from the `.env` file (or environment), NOT from service-specific URLs
- Make sure `DATABASE_URL` in your `.env` points to the correct database before running Prisma commands

---

### Redis Connection Issues

**Symptom**: Service starts but Redis-dependent features fail.

**Check 1: Redis container down**
```bash
# Local
docker compose ps

# Production
curl -s "http://147.93.30.201:8000/api/v1/databases/eg448oos8kos08000w0k40wk" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status'))"
```

**Check 2: Wrong REDIS_URL**
- Production: `redis://default:<password>@<redis-container-uuid>:6379/0` (see `.env` for actual values)
- Local: `redis://localhost:6379`
- The `default` username is required when Redis has a password

**Check 3: Redis memory full**
- Redis is limited to 256m in Coolify
- Check: `redis-cli INFO memory` (from Docker exec)
- Fix: Increase memory or set eviction policy

---

### Frontend Build Issues

**Symptom**: Next.js build fails in Coolify.

**Check 1: Missing NEXT_PUBLIC_* vars**
- All `NEXT_PUBLIC_*` variables MUST be set as `is_buildtime: true` in Coolify
- If set as runtime-only, they'll be `undefined` during build

**Check 2: TypeScript errors**
- The CI runs `npx tsc --noEmit` before build
- Fix type errors locally first: `npx tsc --noEmit`

**Check 3: Build timeout**
- Next.js builds can take 2-4 minutes
- Coolify has a default build timeout. If exceeded, increase in app settings.

---

### Coolify API Issues

**Memory limit error on deploy**
```
Minimum memory limit allowed is 6MB
```
- Cause: Memory limit set as plain number (e.g., `512`) instead of Docker format (`512m`)
- Fix: Always use suffix: `512m`, `1024m`, `1g`

**Duplicate environment variables**
- Cause: POST to envs endpoint with an existing key creates a duplicate
- Fix: GET envs first, check if key exists, then POST (new) or PATCH (update)

**FQDN not updating**
- Cause: Using `fqdn` field in PATCH request
- Fix: Use `domains` field instead: `{"domains": "https://grahvani.in"}`

---

### DNS / SSL Issues

**Symptom**: Domain not resolving or SSL error.

**Check 1: Cloudflare DNS**
- All grahvani.in domains should have A records pointing to `147.93.30.201`
- Records should be Cloudflare-proxied (orange cloud)

**Check 2: SSL mode**
- Cloudflare SSL should be "Full (strict)"
- Traefik handles HTTP internally, Cloudflare terminates SSL

**Check 3: DNS propagation after changes**
- After changing DNS, allow up to 30 minutes for propagation
- Negative caching (NXDOMAIN) can persist for 1800 seconds

---

### Complete Service Outage

**All services down simultaneously:**

1. **Check if KVM4 server is reachable**
```bash
ping 147.93.30.201
curl -s http://147.93.30.201:8000/api/v1/version
```

2. **Check Docker daemon**
```bash
# SSH to server
ssh root@147.93.30.201
docker ps
systemctl status docker
```

3. **Check disk space**
```bash
df -h
# If full: docker system prune -a (removes unused images/containers)
```

4. **Check memory**
```bash
free -h
# If OOM: identify which container is using too much memory
docker stats --no-stream
```

5. **Restart all services** (update UUIDs from Coolify dashboard, including API Gateway)
```bash
TOKEN='$COOLIFY_TOKEN'
BASE="http://147.93.30.201:8000/api/v1"
# Auth, User, Client, Astro Engine, Frontend (add Gateway UUID when available)
for UUID in eg48400cgoc8cwocos8cosg8 jscos8kcwookg48ws8408o8g r8wwc4cggko40cs0cs8s8ogs qkgsko0kkoc004w0w04okggk lk0cksw804s4oc4c4o88ws48; do
  curl -s -X POST "$BASE/applications/$UUID/restart" -H "Authorization: Bearer $TOKEN"
  echo ""
  sleep 3
done
```

---

## Operational Runbook

### Daily Checks
- [ ] GitHub Actions monitor workflow is green (check every few hours)
- [ ] No failed CI runs on main branch
- [ ] Check Grafana for error rate spikes (Loki: `{job="grahvani", level="error"}`)

### Weekly Checks
- [ ] Verify at least 1 daily backup exists: check via Coolify API
- [ ] Review Coolify dashboard for any warnings
- [ ] Check disk usage on KVM4 (`df -h` via SSH)
- [ ] Review Prometheus metrics: p95 latency, error rates per service
- [ ] Verify Loki log retention is working (oldest logs should be ~7 days)

### Monthly Checks
- [ ] Review memory allocation across all services
- [ ] Update Node.js / dependencies if security patches available
- [ ] Rotate secrets if needed (JWT_SECRET, API keys)
- [ ] Clean up old Docker images: `docker image prune -a --filter "until=720h"`

### After Incidents
- [ ] Document what happened and root cause
- [ ] Update this troubleshooting guide with the fix
- [ ] If database was affected, verify backup integrity

---

## Emergency Contacts

| Role | Who | How |
|------|-----|-----|
| Infrastructure | Dr. Tumul Raathi | Project lead, has all credentials |
| Coolify Dashboard | http://147.93.30.201:8000 | Login with admin credentials |
| Cloudflare | astrocorpofficial@gmail.com | DNS and SSL management |
| DigitalOcean | Project account | KVM4 droplet management |

---

## Credential Locations

| Credential | Location |
|------------|----------|
| Coolify API token | `/Users/dr.tumulraathi/.env.corpastro` or Coolify dashboard > API tokens |
| Cloudflare API | `/Users/dr.tumulraathi/.env.corpastro` |
| Database password | Backend `.env` file or Coolify app env vars |
| JWT secrets | Backend `.env` file or Coolify app env vars |
| GitHub repo access | Project-Corp-Astro org membership |
