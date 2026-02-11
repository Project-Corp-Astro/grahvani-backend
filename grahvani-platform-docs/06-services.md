# 6. Services Reference

## Service Overview

| Service | Port | Database Schema | Dockerfile | Health Endpoint | Memory |
|---------|------|----------------|------------|-----------------|--------|
| Auth | 3001 | app_auth | Dockerfile.auth | /health | 512m |
| User | 3002 | app_users | Dockerfile.user | /health | 512m |
| Client | 3008 | app_clients | Dockerfile.client | /health | 512m |
| Astro Engine | 3014 | None (Redis only) | Dockerfile.astro-engine | /health | 1024m |
| Frontend | 3000 | None | Dockerfile (Next.js) | /api/health | 768m |

---

## Auth Service (port 3001)

### Purpose
User authentication, JWT management, session tracking, login security.

### Domain
- Production: https://api-auth.grahvani.in
- Coolify UUID: eg48400cgoc8cwocos8cosg8

### Key Files
- Entry: `services/auth-service/src/main.ts`
- Config: `services/auth-service/src/config/index.ts`
- Routes: `services/auth-service/src/interfaces/http/routes/auth.routes.ts`
- Controller: `services/auth-service/src/interfaces/http/controllers/auth.controller.ts`
- Service: `services/auth-service/src/services/auth.service.ts`
- Password: `services/auth-service/src/services/password.service.ts`
- Token: `services/auth-service/src/services/token.service.ts`
- DB Manager: `services/auth-service/src/config/db-pro.ts`
- Prisma Schema: `services/auth-service/prisma/schema.prisma`
- Tests: `services/auth-service/src/__tests__/production-lifecycle.test.ts`

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/auth/register | No | Create new account |
| POST | /api/v1/auth/login | No | Email + password login |
| POST | /api/v1/auth/refresh | No | Refresh access token |
| POST | /api/v1/auth/logout | Yes | Invalidate session |
| POST | /api/v1/auth/forgot-password | No | Request password reset |
| POST | /api/v1/auth/reset-password | No | Reset password with token |
| GET | /api/v1/auth/verify-email/:token | No | Email verification |
| GET | /api/v1/auth/me | Yes | Get current user |
| GET | /api/v1/auth/sessions | Yes | List active sessions |
| DELETE | /api/v1/auth/sessions/:id | Yes | Revoke session |
| GET | /health | No | Health check |

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3001 | Service port |
| NODE_ENV | No | development | Environment |
| DATABASE_URL | Yes | - | PostgreSQL connection |
| DIRECT_URL | Yes | - | Direct DB (migrations) |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |
| JWT_SECRET | Yes | - | Token signing key (min 32 chars) |
| JWT_REFRESH_SECRET | Yes | - | Refresh token key (min 32 chars) |
| JWT_EXPIRES_IN | No | 15m | Access token TTL |
| JWT_REFRESH_EXPIRES_IN | No | 7d | Refresh token TTL |
| BCRYPT_ROUNDS | No | 12 | Password hashing cost |
| AUTH_STRICT_DEVICE_POLICY | No | true | Single device enforcement |
| INTERNAL_SERVICE_KEY | No | - | Inter-service auth |
| SUPABASE_URL | No | - | Legacy (placeholder in prod) |
| SUPABASE_ANON_KEY | No | - | Legacy (placeholder in prod) |
| SUPABASE_SERVICE_ROLE_KEY | No | - | Legacy (not used) |

### Middleware Chain
1. Helmet (security headers)
2. CORS (grahvani.in domains in prod, * in dev)
3. Body parser (10KB limit)
4. Request logging (method, path, status, duration, IP)
5. Public routes (/api/v1/auth/*) — no auth required
6. Auth middleware (JWT verification) — protected routes only
7. Error handler (global)

### Security Features
- Rate limiting: 50 attempts per 15 min per email:IP (Redis-backed)
- Password: bcrypt with 12 rounds
- JWT: 15min access + 7d refresh, token blacklist on logout
- Sessions: DB-persisted with device/IP tracking
- Audit: Every login attempt logged (success + failure + reason)

---

## User Service (port 3002)

### Purpose
User profile management, preferences, addresses, social graph.

### Domain
- Production: https://api-user.grahvani.in
- Coolify UUID: jscos8kcwookg48ws8408o8g

### Key Files
- Entry: `services/user-service/src/server.ts`
- App: `services/user-service/src/app.ts`
- DB Manager: `services/user-service/src/config/db-pro.ts`
- Redis: `services/user-service/src/config/redis.ts`
- Auth Middleware: `services/user-service/src/middleware/auth.middleware.ts`
- Prisma Schema: `services/user-service/prisma/schema.prisma`
- Tests: `services/user-service/src/__tests__/user-sync.test.ts`

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3002 | Service port |
| NODE_ENV | No | development | Environment |
| DATABASE_URL | Yes | - | PostgreSQL connection |
| USER_DATABASE_URL | No | fallback to DATABASE_URL | Schema-specific URL |
| DIRECT_URL | Yes | - | Direct DB (migrations) |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |
| JWT_SECRET | Yes | - | Token verification |
| JWT_REFRESH_SECRET | Yes | - | Refresh verification |
| INTERNAL_SERVICE_KEY | No | - | Inter-service auth |

### API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/users/me | Yes | Get current user profile |
| PATCH | /api/v1/users/me | Yes | Update current user profile |
| DELETE | /api/v1/users/me | Yes | Delete current user account |
| GET | /api/v1/users/me/addresses | Yes | Get user's addresses |
| POST | /api/v1/users/me/addresses | Yes | Add a new address |
| PATCH | /api/v1/users/me/addresses/:id | Yes | Update an address |
| DELETE | /api/v1/users/me/addresses/:id | Yes | Delete an address |
| GET | /api/v1/users/me/preferences | Yes | Get user preferences |
| PUT | /api/v1/users/me/preferences | Yes | Update all preferences |
| PATCH | /api/v1/users/me/preferences/:category/:key | Yes | Update single preference |
| DELETE | /api/v1/users/me/preferences/:category/:key | Yes | Delete a preference |
| GET | /api/v1/users/ | Admin | List all users (admin only) |
| GET | /api/v1/users/:id | Yes | Get user by ID |
| PATCH | /api/v1/users/:id/status | Admin | Update user status (admin only) |
| PATCH | /api/v1/users/:id/role | Admin | Update user role (admin only) |
| GET | /health | No | Health check |

### Notes
- 16 endpoints total — all require authentication, 3 require admin role
- Sets timezone: `process.env.TZ = "Asia/Kolkata"`
- Redis client uses `redis` package (not ioredis like auth-service)
- Event publishing via Redis pub/sub
- JWT middleware reads `process.env.JWT_SECRET` directly (no Zod validation)

---

## Client Service (port 3008)

### Purpose
Astrologer's client CRM — profiles, charts, consultations, remedies, bulk import.

### Domain
- Production: https://api-client.grahvani.in
- Coolify UUID: r8wwc4cggko40cs0cs8s8ogs

### Key Files
- Entry: `services/client-service/src/server.ts`
- App: `services/client-service/src/app.ts`
- DB Manager: `services/client-service/src/config/db-pro.ts`
- Astro Engine Client: `services/client-service/src/clients/astro-engine.client.ts`
- Geocode Service: `services/client-service/src/services/geocode.service.ts`
- Prisma Schema: `services/client-service/prisma/schema.prisma`

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3008 | Service port |
| NODE_ENV | No | development | Environment |
| DATABASE_URL | Yes | - | PostgreSQL connection |
| CLIENT_DATABASE_URL | No | fallback to DATABASE_URL | Schema-specific URL |
| DIRECT_URL | Yes | - | Direct DB (migrations) |
| REDIS_URL | No | redis://localhost:6379 | Redis connection |
| MEILISEARCH_URL | No | http://localhost:7700 | Search engine |
| MEILISEARCH_KEY | No | (see .env) | Search API key |
| JWT_SECRET | Yes | - | Token verification |
| JWT_REFRESH_SECRET | Yes | - | Refresh verification |
| INTERNAL_SERVICE_KEY | No | - | Inter-service auth |
| ASTRO_ENGINE_URL | No | http://localhost:3014 | Astro engine internal URL |
| GEOCODING_API_KEY | No | - | OpenCage geocoding |

### API Endpoints — Client CRUD & Management (8 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/clients/ | Yes + Tenant | List all clients |
| POST | /api/v1/clients/ | Yes + Tenant | Create a new client |
| GET | /api/v1/clients/:id | Yes + Tenant | Get client by ID |
| PATCH | /api/v1/clients/:id | Yes + Tenant | Update client |
| DELETE | /api/v1/clients/:id | Yes + Tenant | Delete client |
| POST | /api/v1/clients/:id/family-link | Yes + Tenant | Link family member |
| GET | /api/v1/clients/:id/family | Yes + Tenant | Get family links |
| DELETE | /api/v1/clients/:id/family/:relatedId | Yes + Tenant | Remove family link |

### API Endpoints — Consultation History (2 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/clients/:id/history | Yes + Tenant | Add consultation record |
| GET | /api/v1/clients/:id/history | Yes + Tenant | Get consultation history |

### API Endpoints — Chart Management (6 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/clients/:id/charts | Yes + Tenant | Save a chart |
| GET | /api/v1/clients/:id/charts | Yes + Tenant | Get all charts for client |
| DELETE | /api/v1/clients/:id/charts/:chartId | Yes + Tenant | Delete a chart |
| POST | /api/v1/clients/charts/generate-all | Yes + Tenant | Generate charts for all clients |
| POST | /api/v1/clients/:id/charts/generate | Yes + Tenant | Generate a single chart |
| POST | /api/v1/clients/:id/charts/generate-core | Yes + Tenant | Generate core chart set |

### API Endpoints — Vedic Chart Generation (12 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/clients/:id/charts/generate-full | Yes + Tenant | Generate full Vedic profile |
| POST | /api/v1/clients/:id/dasha | Yes + Tenant | Generate Vimshottari Dasha |
| POST | /api/v1/clients/:id/dasha/:system | Yes + Tenant | Generate alternative Dasha system |
| POST | /api/v1/clients/:id/ashtakavarga | Yes + Tenant | Generate Ashtakavarga |
| POST | /api/v1/clients/:id/sudarshan-chakra | Yes + Tenant | Generate Sudarshan Chakra |
| POST | /api/v1/clients/:id/raman/natal | Yes + Tenant | Generate Raman natal chart |
| POST | /api/v1/clients/:id/raman/transit | Yes + Tenant | Generate Raman transit chart |
| POST | /api/v1/clients/:id/raman/divisional/:type | Yes + Tenant | Generate Raman divisional chart |
| POST | /api/v1/clients/:id/raman/dasha/:level | Yes + Tenant | Generate Raman Dasha |
| POST | /api/v1/clients/:id/raman/:type | Yes + Tenant | Generate other Raman charts |
| GET | /health | No | Health check |

### API Endpoints — KP (Krishnamurti Paddhati) System (11 endpoints)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/clients/:id/kp/planets-cusps | Yes + Tenant | KP planets and cusps |
| POST | /api/v1/clients/:id/kp/ruling-planets | Yes + Tenant | KP ruling planets |
| POST | /api/v1/clients/:id/kp/bhava-details | Yes + Tenant | KP bhava (house) details |
| POST | /api/v1/clients/:id/kp/significations | Yes + Tenant | KP significations |
| POST | /api/v1/clients/:id/kp/house-significations | Yes + Tenant | KP house significations |
| POST | /api/v1/clients/:id/kp/planets-significators | Yes + Tenant | KP planet significators |
| POST | /api/v1/clients/:id/kp/interlinks | Yes + Tenant | KP interlinks |
| POST | /api/v1/clients/:id/kp/interlinks-advanced | Yes + Tenant | KP advanced interlinks |
| POST | /api/v1/clients/:id/kp/nakshatra-nadi | Yes + Tenant | KP nakshatra nadi |
| POST | /api/v1/clients/:id/kp/fortuna | Yes + Tenant | KP Fortuna analysis |
| POST | /api/v1/clients/:id/kp/horary | Yes + Tenant | KP horary chart |

### Notes
- **40 endpoints total** — all require authentication + tenant middleware (strict multi-tenancy)
- Sets timezone: `process.env.TZ = "Asia/Kolkata"`
- Calls Astro Engine service internally for chart calculations
- JSONB tags field with GIN index for fast tag searches
- Dasha systems supported: Vimshottari (default), plus alternative systems via `:system` parameter
- Raman endpoints use B.V. Raman ayanamsa (alternate to default Lahiri)
- KP endpoints implement full Krishnamurti Paddhati system for predictive astrology
- Meilisearch env vars are set but search is NOT yet wired in code
- NO tests exist for this service

---

## Astro Engine (port 3014)

### Purpose
Proxy/cache layer to external Astro Engine API. Caches chart calculations in Redis.

### Domain
- Production: https://api-astro.grahvani.in
- Coolify UUID: qkgsko0kkoc004w0w04okggk

### Key Files
- Entry: `services/astro-engine/src/server.ts`
- Config: `services/astro-engine/src/config/index.ts`
- App: `services/astro-engine/src/app.ts`

### NO DATABASE — Redis-only caching
This service does not use PostgreSQL or Prisma. It is a pure proxy that:
1. Receives chart calculation requests
2. Checks Redis cache (24h TTL)
3. On cache miss: proxies to https://astroengine.astrocorp.in
4. Caches the response in Redis
5. Returns result

### Health Endpoints
| Endpoint | Purpose | Response |
|----------|---------|----------|
| GET /live | Liveness probe | `{status: "alive", timestamp}` |
| GET /ready | Readiness probe | `{status: "ready", cache: boolean}` or 503 |
| GET /health | Detailed health | `{status: "healthy/degraded", components: {cache, external}}` |

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3014 | Service port |
| NODE_ENV | No | - | Environment |
| REDIS_URL | No | redis://localhost:6379 | Cache backend |
| ASTRO_ENGINE_EXTERNAL_URL | No | https://astroengine.astrocorp.in | External API |
| CACHE_TTL_SECONDS | No | 86400 | Cache duration (24h) |
| LOG_LEVEL | No | info | Pino log level |

### Features
- Circuit breaker (opossum library) for external API resilience
- Rate limiting (express-rate-limit)
- Degraded state detection (reports healthy vs degraded)
- Memory and uptime reporting in /health

---

## Frontend (port 3000)

### Purpose
Next.js web application for astrologers.

### Domain
- Production: https://grahvani.in (also www.grahvani.in)
- Coolify UUID: lk0cksw804s4oc4c4o88ws48

### Tech Stack
- Next.js 16.1 with App Router
- React 19
- Tailwind 4
- Zustand 5 (state management)
- TanStack Query 5 (server state)
- Framer Motion (animations)

### Key Directories
- Pages: `src/app/` (40+ pages)
- Components: `src/components/` (73+ components)
- Health: `src/app/api/health/route.ts`

### Environment Variables (Coolify build-time)
| Variable | Value |
|----------|-------|
| NEXT_PUBLIC_AUTH_SERVICE_URL | https://api-auth.grahvani.in/api/v1 |
| NEXT_PUBLIC_USER_SERVICE_URL | https://api-user.grahvani.in/api/v1 |
| NEXT_PUBLIC_CLIENT_SERVICE_URL | https://api-client.grahvani.in/api/v1 |

### Health Endpoint
```
GET /api/health → { status: "ok", service: "grahvani-frontend", timestamp: "..." }
```
