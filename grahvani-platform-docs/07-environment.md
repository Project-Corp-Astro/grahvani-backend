# 7. Environment Variables

> **IMPORTANT**: This document describes what environment variables exist and their structure.
> Actual secret values (passwords, tokens, keys) are stored ONLY in the `.env` file and Coolify dashboard.
> Never commit secrets to Git. See the `.env` file for real values.

## How Environment Variables Work

### Local Development
- All services load from the root `.env` file at `/backend/.env`
- Auth service: loads root `.env` first, then `services/auth-service/.env` (override)
- User/Client/Astro: same pattern — root first, service-specific override
- The `.env` file is gitignored — safe to store real credentials

### Production (Coolify)
- Each service has its own env vars set in Coolify dashboard/API
- Services do NOT read from `.env` file in production (NODE_ENV=production skips dotenv)
- Env vars set via Coolify API: POST /api/v1/applications/{uuid}/envs
- Known gotcha: API creates duplicates if you POST the same key twice — always check first

### .env File Location
```
/Users/dr.tumulraathi/AstroCorp/APPS/Grahvani/backend/.env
```

### dotenv Loading Order (per service)
```
1. Root .env (../../../../.env from config file)
2. Service .env (../../.env from config file) — overrides root
```
In production (NODE_ENV=production): dotenv is NOT loaded at all.

---

## Complete Variable Reference

### Shared Across All Backend Services

| Variable | Type | Default | Used By | Description |
|----------|------|---------|---------|-------------|
| NODE_ENV | string | development | all | development / production / test |
| DATABASE_URL | string | required | auth, user, client | PostgreSQL connection URL |
| DIRECT_URL | string | required | auth, user, client | Direct DB URL (Prisma migrations) |
| REDIS_URL | string | redis://localhost:6379 | all 4 | Redis connection URL |
| JWT_SECRET | string | required (min 32) | auth, user, client | JWT signing key |
| JWT_REFRESH_SECRET | string | required (min 32) | auth, user, client | Refresh token key |
| INTERNAL_SERVICE_KEY | string | optional | auth, user, client | Inter-service auth key |

### Auth Service Only

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| PORT | number | 3001 | Service port |
| JWT_EXPIRES_IN | string | 15m | Access token TTL |
| JWT_REFRESH_EXPIRES_IN | string | 7d | Refresh token TTL |
| BCRYPT_ROUNDS | number | 12 | Password hashing cost factor |
| AUTH_STRICT_DEVICE_POLICY | boolean | true | Single-device login enforcement |
| SUPABASE_URL | string | optional | Legacy Supabase API URL |
| SUPABASE_ANON_KEY | string | optional | Legacy Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | string | optional | Legacy Supabase service role key |

### User Service Only

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| PORT | number | 3002 | Service port |
| USER_DATABASE_URL | string | falls back to DATABASE_URL | Schema-specific DB URL |

### Client Service Only

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| PORT | number | 3008 | Service port |
| CLIENT_DATABASE_URL | string | falls back to DATABASE_URL | Schema-specific DB URL |
| MEILISEARCH_URL | string | http://localhost:7700 | Meilisearch URL |
| MEILISEARCH_KEY | string | (see .env) | Meilisearch API key |
| ASTRO_ENGINE_URL | string | http://localhost:3014 | Internal astro engine URL |
| GEOCODING_API_KEY | string | optional | OpenCage geocoding key |

### Astro Engine Only

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| PORT | number | 3014 | Service port |
| ASTRO_ENGINE_EXTERNAL_URL | string | https://astroengine.astrocorp.in | External API to proxy |
| CACHE_TTL_SECONDS | number | 86400 | Redis cache TTL (24h) |
| LOG_LEVEL | string | info | Pino log level |

### Frontend (Coolify build-time)

| Variable | Value | Description |
|----------|-------|-------------|
| NEXT_PUBLIC_AUTH_SERVICE_URL | https://api-auth.grahvani.in/api/v1 | Auth API base |
| NEXT_PUBLIC_USER_SERVICE_URL | https://api-user.grahvani.in/api/v1 | User API base |
| NEXT_PUBLIC_CLIENT_SERVICE_URL | https://api-client.grahvani.in/api/v1 | Client API base |

---

## Production Values (Coolify)

> **All secret values below are shown as `$VARIABLE_NAME` placeholders.**
> Actual values are in the master `.env` file and in Coolify app env vars.

All production env var values are in the master `.env` file (Section 10) and in Coolify per-service settings.

### What Each Service Needs

| Service | Variables | Notes |
|---------|-----------|-------|
| Auth | PORT, NODE_ENV, DATABASE_URL, DIRECT_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, BCRYPT_ROUNDS, INTERNAL_SERVICE_KEY, SUPABASE_URL, SUPABASE_ANON_KEY | Supabase vars are legacy placeholders |
| User | PORT, NODE_ENV, DATABASE_URL, DIRECT_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, INTERNAL_SERVICE_KEY | Shares JWT secrets with Auth |
| Client | PORT, NODE_ENV, DATABASE_URL, DIRECT_URL, REDIS_URL, MEILISEARCH_URL, MEILISEARCH_KEY, JWT_SECRET, JWT_REFRESH_SECRET, INTERNAL_SERVICE_KEY, ASTRO_ENGINE_URL | ASTRO_ENGINE_URL points to Astro Engine's internal hostname |
| Astro Engine | PORT, NODE_ENV, REDIS_URL, ASTRO_ENGINE_EXTERNAL_URL | No database — Redis-only cache |
| Frontend | NEXT_PUBLIC_AUTH_SERVICE_URL, NEXT_PUBLIC_USER_SERVICE_URL, NEXT_PUBLIC_CLIENT_SERVICE_URL | Must be `is_buildtime: true` in Coolify |

### Key Pattern for Production URLs

In production, services communicate over Docker's internal network. Coolify assigns each container a UUID that doubles as its DNS hostname. The URL patterns are:

```
DATABASE_URL = postgres://<user>:<password>@<postgres-container-uuid>:5432/<database>
REDIS_URL    = redis://default:<password>@<redis-container-uuid>:6379/0
```

All internal hostnames (container UUIDs) and credentials are in the `.env` file.

---

## Local Dev Values (.env)

> **Copy the master `.env` file from:**
> `/Users/dr.tumulraathi/AstroCorp/APPS/Grahvani/backend/.env`
>
> Below is the structure — actual secrets are in the `.env` file only.

```
NODE_ENV=development
DATABASE_URL=postgres://<user>:<password>@localhost:5432/grahvani
DIRECT_URL=postgres://<user>:<password>@localhost:5432/grahvani
REDIS_URL=redis://localhost:6379
JWT_SECRET=<your-jwt-secret>
JWT_REFRESH_SECRET=<your-jwt-refresh-secret>
BCRYPT_ROUNDS=12
INTERNAL_SERVICE_KEY=<your-internal-key>
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_KEY=<your-meilisearch-key>
ASTRO_ENGINE_URL=http://localhost:3014
ASTRO_ENGINE_EXTERNAL_URL=https://astroengine.astrocorp.in
GEOCODING_API_KEY=<your-geocoding-key>
```

All actual values are in the master `.env` file. Copy it, don't create from scratch.

---

## Managing Env Vars via Coolify API

```bash
# Set your token (from .env file or Coolify dashboard > API tokens)
COOLIFY_TOKEN="your-token-here"
```

### List env vars
```bash
curl -s "http://147.93.30.201:8000/api/v1/applications/{UUID}/envs" \
  -H "Authorization: Bearer $COOLIFY_TOKEN"
```

### Add env var
```bash
curl -X POST "http://147.93.30.201:8000/api/v1/applications/{UUID}/envs" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "NEW_VAR", "value": "new_value", "is_buildtime": false}'
```

### Update env var
```bash
curl -X PATCH "http://147.93.30.201:8000/api/v1/applications/{UUID}/envs/{ENV_UUID}" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "updated_value"}'
```

### Gotcha: Duplicate Prevention
Always check existing env vars BEFORE adding. The Coolify API will create duplicates if you POST the same key twice.
