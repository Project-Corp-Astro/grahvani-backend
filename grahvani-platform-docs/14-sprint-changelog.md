# 14. Production-Readiness Sprint Changelog

> Complete record of everything implemented across 4 sprints (8 weeks) to bring Grahvani from MVP to production-ready state.

**Sprint Period:** January - February 2026
**Last Updated:** 2026-02-22

---

## Executive Summary

Grahvani is a Vedic astrology SaaS platform built as a microservice architecture (6 deployed services) on a self-hosted DigitalOcean KVM4 server managed by Coolify. A comprehensive audit revealed critical gaps in security, testing, observability, and frontend quality. Four sprints were executed to address them.

### Before vs After

| Area | Before Sprints | After Sprints |
|------|---------------|---------------|
| **Security** | Hardcoded secrets in git, open CORS (`*`), no input validation middleware, no rate limiting on most routes | Gitleaks CI scanning, CORS whitelist, Zod validation on all routes, Redis-backed rate limiting |
| **Testing** | 2 test files (auth + user), 0 frontend tests | 112 tests total (81 backend + 31 frontend), Jest + Vitest infrastructure |
| **Error Handling** | Inconsistent error shapes, no error boundaries, no 404 page | Shared `BaseError` class, canonical error response format, error boundaries + 404 + loading states |
| **Token Management** | No refresh logic, token in localStorage (XSS risk) | Proactive token refresh, refresh mutex, in-memory token store |
| **CI/CD** | No container registry, no rollback, no smoke tests, 3 services in deploy | GHCR images, rollback workflow, post-deploy smoke tests, 5 services in deploy |
| **Monitoring** | No metrics, `console.log` everywhere, no log aggregation | Prometheus on all services, Pino structured JSON logging, Loki + Promtail log collection |
| **Frontend** | No code splitting, duplicated constants across 12+ files, no a11y | Dynamic imports on heavy components, shared constants, ARIA landmarks + skip-to-content |
| **Infrastructure** | No explicit Docker network, missing Dockerfile.gateway, stale docs | Explicit bridge network, all Dockerfiles present, 13 platform docs fully updated |
| **Documentation** | 10 docs (many outdated, gateway listed as "STUB") | 13 docs (all current), incident response playbook, on-call guide |

### Final Sprint Scorecard

| Sprint | Scope | Completed | Skipped | Completion |
|--------|-------|-----------|---------|------------|
| Sprint 1 | Security & Data Protection | 7 / 8 | 1.1 (Backup Offsite) | 88% |
| Sprint 2 | Testing & Error Standardization | 6 / 6 | — | 100% |
| Sprint 3 | CI/CD & Observability | 5 / 6 | 3.4 (Alerting) | 83% |
| Sprint 4 | Performance, A11y & Polish | 6 / 7 | 4.4 (Staging) | 86% |
| **Total** | | **24 / 27** | **3** | **89%** |

The 3 skipped tasks (database backup offsite replication, Grafana alerting rules, staging environment) are infrastructure tasks that require server access or additional planning and were deferred by choice.

---

## Sprint 1: Security Hardening & Data Protection

**Goal:** Eliminate the highest-severity risks — exposed secrets, open CORS, missing validation, no error boundaries, and broken token management.

### 1.1 Database Backup Offsite Replication [SKIPPED]

**Status:** Deferred — requires server access to configure DigitalOcean Spaces and `rclone` cron jobs.

**What was planned:**
- Set up DigitalOcean Spaces bucket for offsite backup replication
- Install `rclone` on KVM4 with cron sync after each Coolify backup
- Create `scripts/verify-backup.sh` for weekly integrity checks
- Document restore procedure in disaster recovery doc

---

### 1.2 Secrets Remediation

**Problem:** Hardcoded secrets in version-controlled files and dangerous JWT fallback values in middleware.

**What was found:**

| Issue | Location | Severity |
|-------|----------|----------|
| Hardcoded `POSTGRES_PASSWORD: grahvani2026prod` | `docker-compose.yml` line 10 | Critical |
| Hardcoded `MEILI_MASTER_KEY` | `docker-compose.yml` line 28 | High |
| JWT fallback `\|\| "your-default-secret-key"` | `user-service/src/middleware/auth.middleware.ts` line 32 | Critical |
| JWT fallback `\|\| "your-default-secret-key"` | `client-service/src/middleware/auth.middleware.ts` line 47 | Critical |

**What was done:**

- **Removed hardcoded passwords** from `docker-compose.yml` — replaced with `${POSTGRES_PASSWORD}` and `${MEILI_MASTER_KEY}` environment variable references
- **Removed dangerous JWT fallbacks** — services now crash on startup if `JWT_SECRET` is missing (fail-fast instead of running with a guessable secret)
- **Added Gitleaks CI scanning** — new job in `ci.yml` that runs `gitleaks/gitleaks-action@v2` with full git history scan before any code reaches production
- **Created `.gitleaks.toml`** — configuration file defining scan rules for API keys, JWT secrets, and allowlisted paths (`.env.example`, `node_modules`, `dist`)
- **Rotated exposed credentials** in production (Coolify + all service DATABASE_URLs)

**Files modified:**
- `docker-compose.yml` — removed hardcoded passwords
- `services/user-service/src/middleware/auth.middleware.ts` — removed JWT fallback
- `services/client-service/src/middleware/auth.middleware.ts` — removed JWT fallback
- `.github/workflows/ci.yml` — added `secrets-scan` job
- `.gitleaks.toml` — new file

---

### 1.3 CORS Lockdown

**Problem:** Multiple services had `cors()` with no origin restriction, allowing any website to make authenticated API requests.

**What was found:**

| Service | File | Issue |
|---------|------|-------|
| API Gateway | `api-gateway/src/server.ts` line 25 | `cors()` — no origin whitelist |
| User Service | `user-service/src/app.ts` line 26 | `cors()` — no origin whitelist |
| Client Service | `client-service/src/app.ts` line 42 | `cors()` — no origin whitelist |
| Astro Engine | `astro-engine/src/app.ts` lines 22-25 | `cors()` — no origin whitelist |

**What was done:**

Applied consistent CORS origin whitelisting across all services:

```
Production origins:
  - https://grahvani.in
  - https://www.grahvani.in

Development: wildcard (*) allowed when NODE_ENV !== 'production'
```

The auth-service already had this pattern implemented — it was replicated to all other services.

**Files modified:**
- `services/api-gateway/src/server.ts`
- `services/user-service/src/app.ts`
- `services/client-service/src/app.ts`
- `services/astro-engine/src/app.ts`

---

### 1.4 Input Validation Enforcement

**Problem:** Zod validation schemas existed but were not wired as Express middleware. Request bodies reached controllers unvalidated.

**What was done:**

- **Created shared `validateBody()` middleware** in `contracts/src/middleware/validate.ts`
  - Factory function accepting a Zod schema
  - Uses `safeParse()` to validate `req.body`
  - Returns 400 with field-level error details on failure
  - Replaces `req.body` with parsed/transformed data on success
- **Wired Zod validators to auth routes** — `RegisterSchema`, `LoginSchema`, `ForgotPasswordSchema`, `ResetPasswordSchema` applied as middleware on their respective endpoints
- **Wired Zod validators to client routes** — `CreateClientSchema`, `UpdateClientSchema` applied to POST/PATCH endpoints
- **Added `express.json({ limit: '10kb' })` body size limits** to user-service and client-service (previously unlimited)

**Files modified:**
- `contracts/src/middleware/validate.ts` — new shared middleware
- `services/auth-service/src/interfaces/http/routes/auth.routes.ts` — wired validators
- `services/client-service/src/interfaces/http/routes/client.routes.ts` — wired validators
- `services/user-service/src/app.ts` — added body size limit
- `services/client-service/src/app.ts` — added body size limit

---

### 1.5 Rate Limiting

**Problem:** Rate limiting middleware existed in auth-service but was not applied to routes. User-service had zero rate limiting.

**What was done:**

- **Applied existing rate limiters to auth routes:**
  - `loginRateLimiter`: 10 attempts per 15 minutes per email:IP (production)
  - `registerRateLimiter`: 5 attempts per hour per IP (production)
  - `passwordResetRateLimiter`: 3 attempts per hour per IP (production)
- **Rate limiter implementation:** Redis-backed using IP + email composite key, with `X-RateLimit-*` response headers
- **Fixed production vs dev distinction** — production enforces strict limits, development uses relaxed limits
- **Graceful degradation** — if Redis is unavailable, rate limiting is bypassed (service stays available)
- **Added rate limiting to user-service** using `express-rate-limit`

**Key file:** `services/auth-service/src/interfaces/http/middlewares/rate-limit.middleware.ts`

---

### 1.6 Frontend Error Boundaries

**Problem:** No error handling UI existed. Unhandled errors showed React's default white screen with stack traces. No 404 page. No loading states.

**What was created:**

| File | Purpose |
|------|---------|
| `src/app/error.tsx` | Root error boundary — styled error page with sun icon, "Something went wrong" message, "Try Again" button, no stack traces in production |
| `src/app/not-found.tsx` | 404 page — moon icon, "Page not found" message, link back to `/dashboard` |
| `src/app/loading.tsx` | Root loading skeleton — CSS-based amber spinner with loading text |
| Route-specific `error.tsx` | Error boundaries for `/vedic-astrology/`, `/clients/`, `/dashboard/` |
| Route-specific `loading.tsx` | Loading states for heavy routes: `/vedic-astrology/`, `/clients/`, `/dashboard/` |

All error pages are styled consistently with the parchment/golden astrology theme (amber color palette, serif headings).

---

### 1.7 Frontend Token Refresh

**Problem:** When JWT access tokens expired (15-minute TTL), users were immediately logged out. The backend returned refresh tokens but the frontend ignored them. Tokens stored in localStorage were vulnerable to XSS.

**What was done:**

| Change | Detail |
|--------|--------|
| **Proactive token refresh** | Decodes JWT `exp` claim, refreshes proactively when < 60 seconds remaining |
| **Refresh mutex** | Prevents concurrent refresh requests using a shared promise — only one refresh in-flight at a time |
| **Retry on 401** | `apiFetch` attempts token refresh on 401 before redirecting to login |
| **Retry on 5xx/429** | Exponential backoff with max 3 retries for server errors and rate limiting |
| **In-memory token store** | Access token moved from localStorage to Zustand store (XSS mitigation) |
| **Page refresh recovery** | Silent refresh on mount when no in-memory token exists |
| **Refresh token storage** | `useAuthMutations.ts` now stores the refresh token from `data.tokens.refreshToken` |
| **Removed redundant storage** | Removed `localStorage.setItem('user', ...)` — relies on React Query cache |

**Key file:** `frontend/src/lib/api.ts` — `apiFetch()` function with full retry and refresh logic

---

### 1.8 CI Test Gate

**Problem:** Client-service was excluded from CI test runs. `--passWithNoTests` flag masked services with no tests.

**What was done:**
- Added client-service to CI test filter
- Verified auth-service and user-service tests pass in CI
- Removed `--passWithNoTests` from CI config so missing tests are flagged
- All 4 backend services now run tests in CI: auth, user, client, astro-engine

**File modified:** `.github/workflows/ci.yml`

---

## Sprint 2: Testing Foundation & Error Standardization

**Goal:** Build test infrastructure and coverage across all services and the frontend. Unify error handling for consistency and debuggability.

### 2.1 Unified Error Handling

**Problem:** Each service had its own error classes, response shapes, and request ID generation. Error responses were inconsistent across services.

**What was done:**

**Shared error classes** extracted to `contracts/src/errors.ts`:

| Class | Status Code | Use Case |
|-------|-------------|----------|
| `BaseError` | Configurable | Base class for all application errors |
| `NotFoundError` | 404 | Resource not found |
| `UnauthorizedError` | 401 | Authentication failure |
| `ForbiddenError` | 403 | Authorization failure |
| `ValidationError` | 400 | Input validation failure (includes `details` array) |
| `ConflictError` | 409 | Duplicate resource |
| `InternalError` | 500 | Unexpected server errors |

**Canonical error response shape** defined in contracts:

```typescript
interface ErrorResponse {
  error: {
    code: string;           // e.g., "VALIDATION_ERROR"
    message: string;        // Human-readable message
    requestId: string;      // UUID v4 correlation ID
    timestamp: string;      // ISO 8601
    path?: string;          // Request path
    details?: ErrorDetail[];// Field-level errors (validation)
  }
}
```

**Request correlation IDs:**
- API Gateway generates UUID v4 `x-request-id` if not present in incoming request
- Forwarded to all downstream services
- Included in every Pino log entry
- Included in every error response
- Replaced `Math.random()` request ID in client-service error middleware

**Files modified:**
- `contracts/src/errors.ts` — new shared error classes
- `services/*/src/middleware/error.middleware.ts` — standardized response shape
- `services/api-gateway/src/server.ts` — x-request-id generation and forwarding

---

### 2.2 Backend Testing Infrastructure

**Problem:** Only auth-service and user-service had Jest configs. Client-service and astro-engine had no test setup.

**What was done:**

| Service | Setup Added |
|---------|-------------|
| client-service | `jest.config.js`, test setup with Prisma mocks (`jest-mock-extended`), Redis mocks |
| astro-engine | `jest.config.js`, test setup with Redis mocks, HTTP mocks |

**Dependencies installed** (as devDependencies):
- `jest`, `ts-jest`, `@types/jest` — test runner with TypeScript support
- `jest-mock-extended` — deep mocking for Prisma client
- Test scripts added to `package.json` for both services

**Pattern followed:** Auth-service's existing `jest.config.js` with `ts-jest` preset and `moduleNameMapper` for path aliases.

---

### 2.3 Backend Unit Tests — 81 Tests

**Test coverage across all 4 backend services:**

| Service | Tests | What's Covered |
|---------|-------|----------------|
| auth-service | 1 | Production lifecycle (startup, health check, graceful shutdown) |
| user-service | 2 | User sync event handling, profile creation |
| client-service | 52 | Client CRUD (create, read, update, delete), chart generation (mock astro-engine), geocoding service, family relationship linking, Zod schema validators, error handling |
| astro-engine | 26 | Redis cache service (get, set, invalidate), circuit breaker pattern, health endpoints (healthy, degraded, unhealthy states), external API client mocking |
| **Total** | **81** | |

**Testing patterns used:**
- **Prisma mocking** — `jest-mock-extended` creates deep mocks of PrismaClient, no database needed
- **Redis mocking** — in-memory Map mimicking Redis get/set/del operations
- **HTTP mocking** — mocked `fetch` for astro-engine external API calls
- **Circuit breaker testing** — simulated failure thresholds and half-open state transitions

---

### 2.4 Frontend Testing Infrastructure

**Problem:** Zero test infrastructure existed in the frontend repo.

**What was created:**

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest config with jsdom environment, v8 coverage provider, `@` path alias, setup file reference |
| `src/test/setup.ts` | Global test setup — `@testing-library/jest-dom` matchers, localStorage mock (in-memory Map with spy functions), `next/navigation` mock (useRouter, usePathname, useSearchParams), afterEach cleanup |
| `src/test/test-utils.tsx` | Custom `render()` function wrapping components with QueryClientProvider (retry:false, infinite cache), re-exports all `@testing-library/react` utilities |
| `package.json` scripts | `"test": "vitest run"`, `"test:coverage": "vitest run --coverage"` |

**Dependencies installed:**
- `vitest` — test runner (Vite-native, faster than Jest for frontend)
- `@testing-library/react` + `@testing-library/jest-dom` — DOM testing utilities
- `jsdom` — browser environment simulation

---

### 2.5 Frontend Unit Tests — 31 Tests

| Category | Tests | What's Covered |
|----------|-------|----------------|
| Utility functions | 13 | `cn()` class merging, `parseDMS()` degree parsing, `formatPlanetDegree()`, `processDashaResponse()`, `formatDateDisplay()`, `standardizeDuration()` from `dasha-utils.ts` |
| API & Store | 12 | `apiFetch` retry logic (5xx retry, 429 retry, 401 refresh, max retries), auth mutations (login stores token, logout clears cache), auth store state management |
| Components | 6 | `ProtectedRoute` (redirect when unauthenticated, render when authenticated), `LoginPage` (form validation, submission, error display), error boundary components |
| **Total** | **31** | |

---

### 2.6 Code Deduplication

**Problem:** JWT verification, database configuration, and Redis setup were duplicated across 3 services with near-identical code.

**What was extracted to `contracts/`:**

| Shared Module | From | Purpose |
|---------------|------|---------|
| `contracts/src/middleware/auth.ts` | user-service + client-service auth middleware | JWT verification with token versioning via Redis, optional blacklist checking, dynamic `jsonwebtoken` import |
| `contracts/src/middleware/validate.ts` | Duplicated validation logic | Zod schema validation middleware factory |
| `contracts/src/errors.ts` | 3 separate BaseError implementations | Unified error class hierarchy |
| Shared database config | `db-pro.ts` duplicated in 3 services | DatabaseManager singleton with health checks |

**Impact:** Reduced maintenance surface — a JWT verification change now requires editing 1 file instead of 3.

---

## Sprint 3: CI/CD Pipeline & Observability

**Goal:** Enable rollback capability, add metrics and log aggregation, standardize logging across all services.

### 3.1 Container Registry (GHCR)

**Problem:** Services were built from source on every deploy. No image registry meant no rollback capability — if a deploy broke production, the only fix was to push a new commit.

**What was done:**

**GHCR build-and-push pipeline** added to `ci.yml`:

| Step | Detail |
|------|--------|
| Authentication | `GHCR_TOKEN` stored in GitHub Actions secrets |
| Image naming | `ghcr.io/project-corp-astro/grahvani-{service}` |
| Tagging | Dual tags: `:{git-sha}` (immutable) + `:latest` (rolling) |
| Caching | Docker layer caching via `cache-from: type=gha` |
| Matrix | 5-service matrix: auth, user, client, astro-engine, gateway |
| Conditional | Only builds images for services that changed (based on `detect-changes` job) |

**Rollback workflow** (`rollback.yml`):

```
Trigger: Manual dispatch (workflow_dispatch)
Inputs:  service (auth/user/client/astro-engine/gateway) + SHA (7-40 hex chars)
Steps:   1. Validate SHA format
         2. Map service → GHCR image + Coolify UUID
         3. Trigger Coolify restart (pulls tagged image)
         4. Post-rollback health check (30s wait + 5 retries at 10s)
```

**Usage example:**
```bash
gh workflow run rollback.yml \
  -R Project-Corp-Astro/grahvani-backend \
  -f service=auth \
  -f sha=abc1234
```

---

### 3.2 CI/CD Hardening

**Problem:** CI pipeline had gaps — no build verification, no post-deploy smoke tests, path detection missed root config files.

**What was added:**

| Enhancement | Detail |
|-------------|--------|
| **Secrets scan** | `gitleaks/gitleaks-action@v2` runs before lint/test with full git history |
| **Turbo build step** | `npx turbo run build` catches TypeScript errors that pass linting |
| **Post-deploy smoke tests** | Wait 30s after deploy, then retry health endpoint 5x at 10s intervals |
| **Expanded path detection** | Root `tsconfig.json`, `turbo.json`, `.eslintrc.js` changes trigger contracts rebuild |
| **Deploy retry logic** | 3 attempts with 10s delay between retries for Coolify API calls |

**CI pipeline is now 5 jobs:**

```
detect-changes → secrets-scan → lint-and-test → build-and-push → deploy (+smoke test)
```

| Job | Purpose | Runs On |
|-----|---------|---------|
| detect-changes | `dorny/paths-filter` to identify changed services | Every push/PR |
| secrets-scan | Gitleaks full history scan | In parallel with detect-changes |
| lint-and-test | Prisma generate, turbo build, ESLint, Jest (all 4 services) | After detect-changes + secrets-scan |
| build-and-push | Docker build → GHCR push (5-service matrix) | After lint-and-test, only on `main` push |
| deploy | Coolify restart API + smoke test (5-service matrix) | After build-and-push, only changed services |

---

### 3.3 Prometheus Metrics

**Problem:** No application-level metrics. No way to track request latency, throughput, or error rates.

**What was done:**

Added `prom-client` to all 5 backend services with a `/metrics` endpoint exposing Prometheus-format metrics.

**Metrics per service:**

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_request_duration_seconds` | Histogram | method, route, status_code | Request latency distribution (buckets: 0.01s to 5s) |
| `http_requests_total` | Counter | method, route, status_code | Total request count |
| `db_query_duration_seconds` | Histogram | operation, table | Database query latency (not on gateway/astro-engine) |
| `proxy_duration_seconds` | Histogram | target, status_code | Proxy latency (gateway only) |
| Default Node.js metrics | Various | — | Memory, CPU, event loop lag, GC |

**Service metric prefixes:**

| Service | Prefix | Endpoint |
|---------|--------|----------|
| Auth | `auth_service_` | `/metrics` on port 3001 |
| User | `user_service_` | `/metrics` on port 3002 |
| Client | `client_service_` | `/metrics` on port 3008 |
| Astro Engine | `astro_engine_` | `/metrics` on port 3014 |
| API Gateway | `api_gateway_` | `/metrics` on port 8080 |

**Prometheus scrape config** documented for all 5 services using Docker-internal hostnames.

---

### 3.4 Alerting [SKIPPED]

**Status:** Deferred — requires Grafana to be deployed first and Slack webhook configuration.

**What was planned:**
- Grafana alerting rules (service down > 2min, disk > 85%, RAM > 90%, backup missing > 26h)
- Slack webhook for `#grahvani-alerts`
- Email fallback notification channel

---

### 3.5 Log Aggregation (Loki + Promtail)

**Problem:** Logs were only accessible via `docker logs` on the server. No centralized log viewing, no search, no retention policy.

**What was created:**

**Architecture:**
```
Docker containers (stdout) → Promtail → Loki → Grafana
```

**Configuration files** in `backend/monitoring/`:

| File | Purpose |
|------|---------|
| `docker-compose.logging.yml` | Loki (512MB, port 3100) + Promtail (128MB, port 9080) containers |
| `loki-config.yml` | TSDB storage, 7-day retention, schema v13, 4MB/s ingestion, 100MB results cache |
| `promtail-config.yml` | Docker service discovery for all Grahvani containers, Pino JSON parsing pipeline |
| `grafana/provisioning/datasources/loki.yml` | Auto-provisions Loki datasource in Grafana |
| `grafana/provisioning/dashboards/dashboards.yml` | File-based dashboard provisioning |
| `grafana/dashboards/grahvani-logs.json` | 3-panel Grafana dashboard |
| `README.md` | Deployment guide, LogQL examples, verification commands |

**Memory budget:**

| Component | Limit |
|-----------|-------|
| Loki | 512 MB |
| Promtail | 128 MB |
| **Total** | **640 MB** |

**Promtail pipeline stages:**
1. JSON parsing of Pino fields (`level`, `msg`, `service`, `requestId`, `err.message`)
2. Template stage mapping Pino numeric levels (10-60) to human-readable names (trace-fatal)
3. Level label extraction for Grafana filtering
4. Log message output formatting

**Grafana dashboard panels:**
1. **Log Volume by Service** — bar chart showing log rate per service over time
2. **Error Logs** — filtered view showing only error/fatal level entries
3. **All Logs** — full log stream with service dropdown filter

**LogQL query examples:**
```logql
{job="grahvani", level="error"}                              # All errors
{job="grahvani", service="auth", level="error"}              # Auth errors
{job="grahvani"} | json | requestId="uuid-here"              # By request ID
sum(rate({job="grahvani", level="error"}[5m])) by (service)  # Error rate
```

---

### 3.6 Standardize Logging

**Problem:** Services used a mix of `console.log`, `console.error`, `morgan("dev")` for HTTP logging, and inconsistent log formats. Promtail requires structured JSON to parse effectively.

**What was done:**

- **Replaced all `console.log/warn/error`** with Pino logger across all 5 backend services
- **Replaced `morgan("dev")`** in API Gateway with `pino-http` for structured HTTP request logging
- **Pino configuration** per service:
  - Development: `pino-pretty` for colorized, human-readable output
  - Production: raw JSON for Promtail/Loki ingestion
  - Log level: `debug` in dev, `info` in production

**Structured log fields:**

| Field | Description |
|-------|-------------|
| `level` | Pino numeric level (10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal) |
| `msg` | Human-readable message |
| `service` | Service identifier (e.g., `auth-service`) |
| `requestId` | UUID correlation ID from `x-request-id` header |
| `err` | Error object with message and stack (when present) |
| `time` | Unix timestamp (milliseconds) |

---

## Sprint 4: Frontend Performance, Accessibility & Production Polish

**Goal:** Optimize frontend bundle size, improve accessibility, fix Docker networking, and bring all documentation up to date.

### 4.1 Frontend Performance

**Problem:** Heavy astrology components (Dasha systems, KP charts) were bundled together. The initial page load pulled in code for all 11 dasha systems and 17+ KP components regardless of what the user was viewing.

**What was done:**

**Dynamic imports added via `next/dynamic`:**

| Page | Components Lazy-Loaded | Approximate Size Reduction |
|------|----------------------|--------------------------|
| `dashas/page.tsx` | 9 specialized dasha components (TribhagiDasha, ShodashottariDasha, etc.) | Each 300-500 lines deferred from initial bundle |
| `kp/page.tsx` | 17 KP-specific components (via `.then()` for named exports) | 1,161-line page split into lazy chunks |
| Modals | `DivisionalChartZoomModal`, `GlobalSettingsModal`, yoga/dosha modals | Modal code only loaded when opened |

**Bundle analysis:**
- Installed `@next/bundle-analyzer`
- Added `"analyze": "ANALYZE=true next build"` script to `package.json`
- Used to identify and verify code splitting effectiveness

---

### 4.2 Frontend Code Quality

**Problem:** `PLANET_COLORS` constant (mapping planet names to colors) was duplicated across 12+ files. Large page files exceeded 800-1,100 lines.

**What was done:**

- **Extracted `PLANET_COLORS`** to shared `src/lib/astrology-constants.ts` — all 12 files now import from one source
- **File organization improvements** for maintainability

**Impact:** A color scheme change for any planet now requires editing 1 file instead of 12.

---

### 4.3 Accessibility

**Problem:** No keyboard navigation support, no skip-to-content link, no ARIA landmarks, form inputs missing label associations, viewport zoom disabled.

**What was implemented:**

| Feature | Implementation |
|---------|---------------|
| **Skip-to-content link** | Visually hidden link before GlobalHeader, visible on keyboard focus (`sr-only` + `focus:not-sr-only`), jumps to `<main id="main-content">` |
| **ARIA landmarks** | `role="banner"` on header, `role="navigation"` on nav, `role="main"` on main content |
| **Keyboard Escape handling** | Pressing Escape closes modals, dropdowns, and overlays with focus returning to trigger element |
| **Form labels** | `htmlFor`/`id` associations on login page and ClientForm inputs |
| **Viewport zoom** | Removed `maximum-scale=1` from viewport meta tag, allowing pinch-to-zoom on mobile |

---

### 4.4 Staging Environment [SKIPPED]

**Status:** Deferred — requires creating Coolify apps, staging database, and Cloudflare DNS records.

**What was planned:**
- `staging` branch with separate deploy pipeline
- Minimal staging apps: staging-auth (256MB), staging-client (256MB), staging-gateway (128MB)
- Staging database (`grahvani_staging`) in existing PostgreSQL
- DNS: `staging-auth.grahvani.in`, `staging-client.grahvani.in`

---

### 4.5 Docker Networking Fix

**Problem:** `docker-compose.prod.yml` had no explicit Docker network defined. When deploying via Coolify (which runs each app as a separate container), services could end up on different Docker networks, breaking internal DNS resolution between services.

**What was done:**

- **Added explicit `grahvani` bridge network** to `docker-compose.prod.yml`
  - All 5 services (auth, user, client, astro-engine, api-gateway) connected to the network
  - Network defined with `driver: bridge` at the bottom of the compose file
- **Created `Dockerfile.gateway`** at backend root
  - CI referenced `Dockerfile.gateway` but only `services/api-gateway/Dockerfile` existed
  - Multi-stage build matching other service Dockerfiles (deps → builder → pruner → runner)
  - Uses `node:22-alpine`, non-root user (grahvani:1001), exposes port 8080
- **Updated infrastructure documentation** with network topology diagram, internal URL table, and Coolify networking considerations

**Internal service URL table (Docker DNS):**

| Service | Internal URL | Used By |
|---------|-------------|---------|
| Auth | `http://auth-service:3001` | API Gateway |
| User | `http://user-service:3002` | API Gateway |
| Client | `http://client-service:3008` | API Gateway |
| Astro Engine | `http://astro-engine:3014` | Client Service |
| PostgreSQL | `postgres://...@grahvani-pg:5432/grahvani` | Auth, User, Client |
| Redis | `redis://grahvani-redis:6379` | All services |

---

### 4.6 Documentation Overhaul

**Problem:** Platform docs were outdated — gateway listed as "STUB -- not deployed" when it was fully deployed, CI/CD docs didn't reflect GHCR pipeline, monitoring docs didn't cover Prometheus/Loki, and no incident response or on-call documentation existed.

**What was updated:**

| Document | Key Changes |
|----------|-------------|
| `01-architecture.md` | Gateway from "STUB" to deployed, updated architecture diagram, added gateway service description, added Pino/Prometheus to tech stack |
| `02-infrastructure.md` | Added gateway to resource inventory (256m), added Docker Networking section with topology diagram, updated memory allocation (4864m total), added audit commands |
| `04-ci-cd.md` | Rewrote for 5-job pipeline (detect-changes → secrets-scan → lint-and-test → build-and-push → deploy), added GHCR docs, rollback workflow, smoke tests, deploy matrix |
| `06-services.md` | Added full API Gateway section (routes, endpoints, env vars, features), fixed client-service test count (52), updated frontend env vars to gateway URLs |
| `07-environment.md` | Added API Gateway env vars section, updated frontend URLs to gateway, added gateway to "What Each Service Needs" table |
| `08-monitoring.md` | Expanded to 5-layer approach, added Prometheus metrics (Layer 4) and Loki log aggregation (Layer 5), updated logging section for Pino |
| `09-developer-guide.md` | Added gateway to dev commands/health checks/service table, updated test coverage to 112 total, added frontend test commands |
| `10-troubleshooting.md` | Updated restart-all script for gateway, added Prometheus/Loki checks to operational runbook |

**What was created:**

| Document | Content |
|----------|---------|
| `12-incident-response.md` | Severity levels (P1-P4) with response times, 4-step diagnosis checklist (assess scope → check infrastructure → check logs → check databases), common incidents (service crash, high memory, DB exhaustion, deploy failure, Redis loss), rollback procedure (GitHub Actions + Coolify), communication guidelines |
| `13-on-call-guide.md` | Quick access links, per-service playbooks (auth/user/client/astro-engine/gateway/frontend) with impact assessment and first-response commands, database troubleshooting, disk cleanup, deployment issues, PromQL queries to watch, LogQL investigation examples, escalation matrix |

**Documentation inventory after Sprint 4:**

| # | Document | Status |
|---|----------|--------|
| 1 | Architecture | Updated |
| 2 | Infrastructure | Updated |
| 3 | Deployment | Current |
| 4 | CI/CD Pipeline | Rewritten |
| 5 | Database | Current |
| 6 | Services Reference | Updated |
| 7 | Environment Variables | Updated |
| 8 | Monitoring & Health | Expanded |
| 9 | Developer Guide | Updated |
| 10 | Troubleshooting | Updated |
| 12 | Incident Response | New |
| 13 | On-Call Guide | New |
| 14 | Sprint Changelog | New (this document) |

---

### 4.7 SEO & Meta

**Problem:** No Open Graph or Twitter Card meta tags, no sitemap, no robots.txt, missing structured metadata.

**What was created:**

| File | Purpose |
|------|---------|
| `src/app/sitemap.ts` | Next.js sitemap generator — lists public pages (`/`, `/login`, `/register`) with `lastModified`, `changeFrequency`, and `priority` |
| `src/app/robots.ts` | Robots.txt configuration — allows `/`, `/login`, `/register`; disallows `/dashboard/`, `/clients/`, `/vedic-astrology/`, `/api/` and all protected routes |
| Root `layout.tsx` metadata | OpenGraph meta tags (title, description, site name, image), Twitter Card meta (large summary card), keyword list, title template pattern |

---

## Cross-Cutting Summary

### Files Created (New)

| File | Sprint | Category |
|------|--------|----------|
| `backend/.gitleaks.toml` | 1.2 | Security |
| `backend/contracts/src/middleware/validate.ts` | 1.4 | Shared middleware |
| `backend/contracts/src/middleware/auth.ts` | 2.6 | Shared middleware |
| `backend/contracts/src/errors.ts` | 2.1 | Shared error classes |
| `backend/.github/workflows/rollback.yml` | 3.1 | CI/CD |
| `backend/Dockerfile.gateway` | 4.5 | Infrastructure |
| `backend/monitoring/docker-compose.logging.yml` | 3.5 | Observability |
| `backend/monitoring/loki-config.yml` | 3.5 | Observability |
| `backend/monitoring/promtail-config.yml` | 3.5 | Observability |
| `backend/monitoring/grafana/provisioning/datasources/loki.yml` | 3.5 | Observability |
| `backend/monitoring/grafana/provisioning/dashboards/dashboards.yml` | 3.5 | Observability |
| `backend/monitoring/grafana/dashboards/grahvani-logs.json` | 3.5 | Observability |
| `backend/monitoring/README.md` | 3.5 | Documentation |
| `backend/grahvani-platform-docs/12-incident-response.md` | 4.6 | Documentation |
| `backend/grahvani-platform-docs/13-on-call-guide.md` | 4.6 | Documentation |
| `frontend/src/app/error.tsx` | 1.6 | Error handling |
| `frontend/src/app/not-found.tsx` | 1.6 | Error handling |
| `frontend/src/app/loading.tsx` | 1.6 | Error handling |
| `frontend/vitest.config.ts` | 2.4 | Testing |
| `frontend/src/test/setup.ts` | 2.4 | Testing |
| `frontend/src/test/test-utils.tsx` | 2.4 | Testing |
| `frontend/src/lib/astrology-constants.ts` | 4.2 | Code quality |
| `frontend/src/app/sitemap.ts` | 4.7 | SEO |
| `frontend/src/app/robots.ts` | 4.7 | SEO |

### Test Coverage Summary

| Layer | Framework | Tests | Covered |
|-------|-----------|-------|---------|
| auth-service | Jest | 1 | Production lifecycle |
| user-service | Jest | 2 | User sync, profile creation |
| client-service | Jest | 52 | CRUD, charts, family, geocoding, validators |
| astro-engine | Jest | 26 | Cache, circuit breaker, health, API clients |
| **Backend total** | | **81** | |
| Frontend utilities | Vitest | 13 | cn, parseDMS, formatPlanetDegree, dasha-utils |
| Frontend API/store | Vitest | 12 | apiFetch retry, auth mutations, auth store |
| Frontend components | Vitest | 6 | ProtectedRoute, LoginPage, error boundaries |
| **Frontend total** | | **31** | |
| **Grand total** | | **112** | |

### Monitoring Stack

```
Layer 1: Coolify Health Checks ........... Container-level, every 30s
Layer 2: GitHub Actions Monitor .......... External endpoint checks, every 15 min
Layer 3: Service /health Endpoints ....... Built-in status with component checks
Layer 4: Prometheus Metrics .............. Request duration, throughput, error rate
Layer 5: Loki + Promtail Log Aggregation . Centralized logs, 7-day retention
```

### Memory Budget (Post-Sprint)

```
Backend Services:
  Auth Service .......... 512m
  User Service .......... 512m
  Client Service ........ 512m
  Astro Engine ......... 1024m
  API Gateway ........... 256m

Frontend:
  Next.js ............... 768m

Databases:
  PostgreSQL ........... 1024m
  Redis ................. 256m

Monitoring (new):
  Loki .................. 512m
  Promtail .............. 128m

==========================================
Total Grahvani:        5504m (5.38 GB)
KVM4 Total:           16384m (16.0 GB)
Other AstroCorp Apps:  ~5000m (4.9 GB)
Free:                  ~5880m (~36%)
```

### CI/CD Pipeline (Final State)

```
GitHub Push to main
        |
        v
  detect-changes (paths-filter for 6 services)
  secrets-scan (gitleaks full history)
        |
        v
  lint-and-test
    - Prisma generate (3 schemas)
    - Turbo build (full type-check)
    - ESLint (all services)
    - Jest (4 services, 81 tests)
        |
        v
  build-and-push
    - Docker build for changed services
    - Push to GHCR with :{sha} + :latest tags
    - Docker layer caching
        |
        v
  deploy (5-service matrix, max-parallel: 2)
    - Coolify restart API (3 retries)
    - 30s stabilization wait
    - Smoke test (5 health checks at 10s intervals)
```

### Skipped Tasks (Deferred)

| Task | Reason | Prerequisite |
|------|--------|-------------|
| 1.1 Database Backup Offsite | Requires server access for rclone + DigitalOcean Spaces setup | SSH access to KVM4, DO Spaces account |
| 3.4 Alerting | Requires Grafana deployment + Slack webhook configuration | Prometheus + Grafana running, Slack workspace |
| 4.4 Staging Environment | Requires Coolify apps, staging DB, Cloudflare DNS | Available memory on KVM4 (~640MB needed) |
