# 2. Infrastructure -- KVM4 Server & Coolify

## Server Details

| Property | Value |
|----------|-------|
| IP Address | 147.93.30.201 |
| Provider | DigitalOcean Droplet |
| RAM | 16 GB |
| Management | Coolify (http://147.93.30.201:8000) |
| Reverse Proxy | Traefik 3.6.7 |
| OS | Ubuntu (Docker host) |

The KVM4 server hosts all Grahvani services alongside other AstroCorp projects (CorpAstro website, Gowraj, Astro Ratan Web Chat). Grahvani uses approximately 4.6 GB of the 16 GB available.

---

## Coolify Overview

Coolify is an open-source, self-hosted PaaS (Platform as a Service) -- essentially a self-hosted alternative to Heroku, Vercel, or Railway. It provides:

- **Docker container management** -- each service runs in its own isolated container
- **Git-based deployments** -- connects to GitHub repos and builds on push or API trigger
- **Environment variable management** -- per-app env vars with build-time vs runtime distinction
- **Health check monitoring** -- automatic container health monitoring with restart policies
- **Database provisioning** -- managed PostgreSQL and Redis containers with backup scheduling
- **Reverse proxy integration** -- auto-configures Traefik routing rules per app

### Access Details

| Property | Value |
|----------|-------|
| Dashboard URL | http://147.93.30.201:8000 |
| API Base URL | http://147.93.30.201:8000/api/v1 |
| API Token | See `.env` file (`COOLIFY_TOKEN`) |
| Server UUID | `y440w0wk84w84c0sssgwo4co` |
| Project UUID | `ywc8kkgkgoooos00o480wk0g` |

---

## Resource Inventory

Grahvani has **8 resources** deployed on KVM4 via Coolify:

| Resource | Type | UUID | Domain | Port | Memory | Status |
|----------|------|------|--------|------|--------|--------|
| Auth Service | App | `eg48400cgoc8cwocos8cosg8` | api-auth.grahvani.in | 3001 | 512m | running:healthy |
| User Service | App | `jscos8kcwookg48ws8408o8g` | api-user.grahvani.in | 3002 | 512m | running:healthy |
| Client Service | App | `r8wwc4cggko40cs0cs8s8ogs` | api-client.grahvani.in | 3008 | 512m | running:healthy |
| Astro Engine | App | `qkgsko0kkoc004w0w04okggk` | api-astro.grahvani.in | 3014 | 1024m | running:healthy |
| API Gateway | App | See Coolify | api-gateway.grahvani.in | 8080 | 256m | running:healthy |
| Frontend | App | `lk0cksw804s4oc4c4o88ws48` | grahvani.in | 3000 | 768m | running:healthy |
| PostgreSQL | DB | `nwwokgkgwgg04cok0wsc408g` | internal:5432 | 5433 ext | 1024m | running:healthy |
| Redis | DB | `eg448oos8kos08000w0k40wk` | internal:6379 | - | 256m | running:healthy |

### UUID Quick Reference

For scripting and API calls, here are the UUIDs grouped by type:

**Applications:**
```
AUTH_UUID=eg48400cgoc8cwocos8cosg8
USER_UUID=jscos8kcwookg48ws8408o8g
CLIENT_UUID=r8wwc4cggko40cs0cs8s8ogs
ASTRO_UUID=qkgsko0kkoc004w0w04okggk
GATEWAY_UUID=<check Coolify dashboard>
FRONTEND_UUID=lk0cksw804s4oc4c4o88ws48
```

**Databases:**
```
POSTGRES_UUID=nwwokgkgwgg04cok0wsc408g
REDIS_UUID=eg448oos8kos08000w0k40wk
```

---

## Memory Allocation Breakdown

KVM4 has 16 GB total RAM. Here is how Grahvani's allocation breaks down:

```
Grahvani Memory Budget (16 GB total on KVM4)
=============================================

Backend Services:
  Auth Service .......... 512m
  User Service .......... 512m
  Client Service ........ 512m
  Astro Engine ......... 1024m   (largest -- handles chart calculations)
  API Gateway ........... 256m
                        ------
  Backend subtotal:     2816m (2.75 GB)

Frontend:
  Next.js Frontend ...... 768m
                        ------
  Frontend subtotal:     768m (0.75 GB)

Databases:
  PostgreSQL ........... 1024m
  Redis ................. 256m
                        ------
  Database subtotal:    1280m (1.25 GB)

=============================================
GRAHVANI TOTAL:         4864m (4.75 GB)

KVM4 Total:            16384m (16.0 GB)
Grahvani Usage:         4864m ( 4.75 GB)  ~30%
Other AstroCorp Apps:  ~5000m ( 4.9 GB)   ~31%
OS + Overhead:         ~6520m ( 6.37 GB)  ~39% free
```

The Astro Engine gets 1024m because it handles computationally intensive birth chart calculations (47 chart types, Dasha systems, Yogas, Doshas). All other backend services get 512m which is sufficient for standard CRUD + auth operations.

---

## Traefik Reverse Proxy

Traefik v3.6.7 is the reverse proxy that routes incoming HTTP/HTTPS traffic to the correct Docker container.

### How Routing Works

```
Internet
   |
Cloudflare (DNS + SSL termination)
   |
   v
KVM4 (147.93.30.201)
   |
Traefik :80/:443
   |
   +-- grahvani.in ------------> Frontend container :3000
   +-- api-gateway.grahvani.in -> API Gateway container :8080 ─┐
   +-- api-auth.grahvani.in ---> Auth Service container :3001 <┤
   +-- api-user.grahvani.in ---> User Service container :3002 <┤
   +-- api-client.grahvani.in -> Client Service container :3008<┘
   +-- api-astro.grahvani.in --> Astro Engine container :3014
```

**Note:** The API Gateway proxies to auth, user, and client services internally via Docker networking. Direct subdomain access to individual services is also available via Traefik.

### Key Points

- **Subdomain-based routing**: Each service gets its own subdomain (not path-based)
- **SSL termination at Cloudflare**: Traefik receives already-decrypted traffic from Cloudflare. Cloudflare re-encrypts using Full Strict mode with origin certificates.
- **Automatic configuration**: Coolify auto-generates Traefik labels on each container. No manual Traefik config files needed.
- **Health-aware routing**: Traefik only routes to containers that pass health checks.
- **Internal services**: PostgreSQL and Redis are NOT exposed via Traefik. They communicate over Docker's internal network only. PostgreSQL has port 5433 mapped externally for emergency direct access.

---

## DNS Configuration

### Provider
Cloudflare manages all DNS for `grahvani.in`.

### DNS Records

| Type | Name | Value | Proxy | TTL |
|------|------|-------|-------|-----|
| A | `grahvani.in` | 147.93.30.201 | Proxied (orange cloud) | Auto |
| A | `api-auth.grahvani.in` | 147.93.30.201 | Proxied (orange cloud) | Auto |
| A | `api-user.grahvani.in` | 147.93.30.201 | Proxied (orange cloud) | Auto |
| A | `api-client.grahvani.in` | 147.93.30.201 | Proxied (orange cloud) | Auto |
| A | `api-astro.grahvani.in` | 147.93.30.201 | Proxied (orange cloud) | Auto |
| A | `api-gateway.grahvani.in` | 147.93.30.201 | Proxied (orange cloud) | Auto |

All records point to the same KVM4 IP. Traefik differentiates by the `Host` header.

### SSL Configuration

- **Mode**: Full (Strict) -- Cloudflare encrypts end-to-end with origin certificate validation
- **Certificates**: Cloudflare-issued edge certificates (auto-renewal, no manual cert management)
- **Origin certificates**: Managed by Coolify/Traefik (Let's Encrypt or Cloudflare origin certs)
- **Always HTTPS**: Enabled -- all HTTP requests are redirected to HTTPS at the Cloudflare edge

---

## Docker Networking

### Network Topology

All Grahvani services share a `grahvani` Docker bridge network for internal communication. This enables services to reach each other via container names (Docker DNS) instead of external URLs.

```
grahvani (bridge network)
   |
   +-- grahvani-auth         (auth-service:3001)
   +-- grahvani-user         (user-service:3002)
   +-- grahvani-client       (client-service:3008)
   +-- grahvani-astro-engine (astro-engine:3014)
   +-- grahvani-gateway      (api-gateway:8080)
   |
   +-- grahvani-pg           (postgres:5432)   [database network]
   +-- grahvani-redis        (redis:6379)      [database network]
```

### Internal Service URLs

When services communicate internally, they use Docker container names, NOT external domains:

| Service | Internal URL | Used By |
|---------|-------------|---------|
| Auth | `http://auth-service:3001` | API Gateway |
| User | `http://user-service:3002` | API Gateway |
| Client | `http://client-service:3008` | API Gateway |
| Astro Engine | `http://astro-engine:3014` | Client Service |
| PostgreSQL | `postgres://grahvani:***@grahvani-pg:5432/grahvani` | Auth, User, Client |
| Redis | `redis://grahvani-redis:6379` | All services |

### Coolify Network Considerations

In Coolify, each application runs in its own container. To ensure internal DNS resolution works:

1. All Grahvani apps must be on the same Docker network
2. In Coolify, either:
   - Deploy all services via a single Docker Compose resource, OR
   - Manually connect apps to a shared network: `docker network connect <network> <container>`
3. Verify connectivity: `docker exec grahvani-gateway wget -qO- http://auth-service:3001/health`

### Audit Commands

```bash
# List all Docker networks
docker network ls

# Inspect the Grahvani network
docker network inspect grahvani

# Check which network a container is on
docker inspect grahvani-gateway --format '{{json .NetworkSettings.Networks}}' | jq .

# Test internal connectivity from gateway
docker exec grahvani-gateway wget -qO- http://auth-service:3001/health
docker exec grahvani-gateway wget -qO- http://user-service:3002/health
docker exec grahvani-gateway wget -qO- http://client-service:3008/health
```

---

## Coolify API Reference

All API calls use the same authorization header:

```bash
# Set COOLIFY_TOKEN from .env file or Coolify dashboard > API tokens
AUTH_HEADER="Authorization: Bearer $COOLIFY_TOKEN"
BASE_URL="http://147.93.30.201:8000/api/v1"
```

### Get Application Details

Retrieve full configuration for a service.

```bash
# Get Auth Service details
curl -s "$BASE_URL/applications/eg48400cgoc8cwocos8cosg8" \
  -H "$AUTH_HEADER" | jq .

# Get User Service details
curl -s "$BASE_URL/applications/jscos8kcwookg48ws8408o8g" \
  -H "$AUTH_HEADER" | jq .

# Get Client Service details
curl -s "$BASE_URL/applications/r8wwc4cggko40cs0cs8s8ogs" \
  -H "$AUTH_HEADER" | jq .

# Get Astro Engine details
curl -s "$BASE_URL/applications/qkgsko0kkoc004w0w04okggk" \
  -H "$AUTH_HEADER" | jq .

# Get Frontend details
curl -s "$BASE_URL/applications/lk0cksw804s4oc4c4o88ws48" \
  -H "$AUTH_HEADER" | jq .
```

### Update Application Configuration

Update settings like memory limits, domains, or health checks.

```bash
# Update Auth Service memory limit to 768m
curl -s -X PATCH "$BASE_URL/applications/eg48400cgoc8cwocos8cosg8" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"limits_memory": "768m"}'

# Update Frontend domain
curl -s -X PATCH "$BASE_URL/applications/lk0cksw804s4oc4c4o88ws48" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"domains": "https://grahvani.in"}'
```

### Restart Application

Trigger a restart (pulls latest code, rebuilds, and redeploys).

```bash
# Restart Auth Service
curl -s -X POST "$BASE_URL/applications/eg48400cgoc8cwocos8cosg8/restart" \
  -H "$AUTH_HEADER"

# Restart User Service
curl -s -X POST "$BASE_URL/applications/jscos8kcwookg48ws8408o8g/restart" \
  -H "$AUTH_HEADER"

# Restart Client Service
curl -s -X POST "$BASE_URL/applications/r8wwc4cggko40cs0cs8s8ogs/restart" \
  -H "$AUTH_HEADER"

# Restart Astro Engine
curl -s -X POST "$BASE_URL/applications/qkgsko0kkoc004w0w04okggk/restart" \
  -H "$AUTH_HEADER"

# Restart Frontend
curl -s -X POST "$BASE_URL/applications/lk0cksw804s4oc4c4o88ws48/restart" \
  -H "$AUTH_HEADER"
```

### Get Environment Variables

```bash
# Get Auth Service env vars
curl -s "$BASE_URL/applications/eg48400cgoc8cwocos8cosg8/envs" \
  -H "$AUTH_HEADER" | jq .

# Get Frontend env vars (includes NEXT_PUBLIC_* build-time vars)
curl -s "$BASE_URL/applications/lk0cksw804s4oc4c4o88ws48/envs" \
  -H "$AUTH_HEADER" | jq .
```

### Add Environment Variable

```bash
# Add a runtime env var to Auth Service
curl -s -X POST "$BASE_URL/applications/eg48400cgoc8cwocos8cosg8/envs" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "NEW_VAR_NAME",
    "value": "new_value",
    "is_buildtime": false,
    "is_preview": false
  }'
```

**WARNING**: The API creates duplicate entries if you POST the same key twice. Always check existing env vars with GET before adding new ones.

### Get Database Details

```bash
# Get PostgreSQL details
curl -s "$BASE_URL/databases/nwwokgkgwgg04cok0wsc408g" \
  -H "$AUTH_HEADER" | jq .

# Get Redis details
curl -s "$BASE_URL/databases/eg448oos8kos08000w0k40wk" \
  -H "$AUTH_HEADER" | jq .
```

### Get Database Backups

```bash
# List PostgreSQL backups
curl -s "$BASE_URL/databases/nwwokgkgwgg04cok0wsc408g/backups" \
  -H "$AUTH_HEADER" | jq .
```

### Check Server Status

```bash
# Get server details
curl -s "$BASE_URL/servers/y440w0wk84w84c0sssgwo4co" \
  -H "$AUTH_HEADER" | jq .

# Get all resources in the Grahvani project
curl -s "$BASE_URL/projects/ywc8kkgkgoooos00o480wk0g" \
  -H "$AUTH_HEADER" | jq .
```

---

## Coolify API Gotchas

These are hard-won lessons. Read before making API calls.

### 1. Memory Limits MUST Use Docker Suffix

```bash
# WRONG -- 512 means 512 bytes, causes "Minimum memory limit allowed is 6MB"
curl -X PATCH ... -d '{"limits_memory": "512"}'
curl -X PATCH ... -d '{"limits_memory": 512}'

# CORRECT -- use Docker-format suffix
curl -X PATCH ... -d '{"limits_memory": "512m"}'
curl -X PATCH ... -d '{"limits_memory": "1024m"}'
curl -X PATCH ... -d '{"limits_memory": "1g"}'
```

Valid suffixes: `m` (megabytes), `g` (gigabytes). Always use lowercase.

### 2. Environment Variable Field is `is_buildtime`

```bash
# WRONG -- underscore in wrong place
{ "key": "FOO", "value": "bar", "is_build_time": true }

# CORRECT -- no underscore between "build" and "time"
{ "key": "FOO", "value": "bar", "is_buildtime": true }
```

### 3. Environment Variables Create Duplicates

The Coolify API does NOT upsert. If you POST the same key twice, you get two entries with the same key. The behavior when duplicates exist is undefined. Always GET envs first, then decide whether to POST (new) or PATCH (update).

### 4. FQDN vs Domains Field

```bash
# WRONG -- fqdn is read-only on update
curl -X PATCH ... -d '{"fqdn": "https://grahvani.in"}'

# CORRECT -- use "domains" field
curl -X PATCH ... -d '{"domains": "https://grahvani.in"}'
```

### 5. NODE_ENV=production as Build-Time Breaks Builds

If `NODE_ENV=production` is set as a build-time variable (`is_buildtime: true`), then `npm ci` will skip devDependencies. This means `typescript`, `tsc`, and other build tools will not be installed, causing `tsc: not found` errors during the build stage.

**Solution**: Set `NODE_ENV=production` as a **runtime-only** variable (`is_buildtime: false`). The Dockerfiles handle the build environment separately.

### 6. DNS Migration Gap

When migrating DNS records, do NOT delete the old record then create the new one. The gap between delete and create causes NXDOMAIN responses, which get cached by DNS resolvers for up to 1800 seconds (SOA negative TTL).

**Solution**: Create the new record first, verify it resolves, then delete the old record.

---

## Shared KVM4 Resources

Grahvani shares KVM4 with other AstroCorp projects. For awareness:

| Project | Resources | Memory |
|---------|-----------|--------|
| Grahvani | 6 apps + 2 DBs | ~4.75 GB |
| CorpAstro | 4 apps + 2 DBs | ~3.3 GB |
| Gowraj | 3 apps + 1 DB | ~2.6 GB |
| Astro Ratan Web Chat | 1 app | ~0.5 GB |
| **Total Allocated** | | **~11.0 GB** |
| **Free (OS + headroom)** | | **~5.0 GB** |

Be mindful of total server memory when increasing limits for Grahvani services. The server has no swap configured -- running out of RAM will cause OOM kills.
