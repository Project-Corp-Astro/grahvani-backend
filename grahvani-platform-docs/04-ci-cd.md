# 4. CI/CD Pipeline

## Overview

Grahvani uses GitHub Actions for CI/CD across two repositories:

| Repository | Workflow | Purpose |
|-----------|---------|---------|
| `Project-Corp-Astro/grahvani-backend` | `ci.yml` | Lint, test, build → GHCR push → deploy 5 services + smoke test |
| `Project-Corp-Astro/grahvani-backend` | `monitor.yml` | Health check all endpoints every 15 min |
| `Project-Corp-Astro/grahvani-backend` | `rollback.yml` | Manual rollback to a specific GHCR image tag |
| `Project-Corp-Astro/frontend-grahvani-software` | `ci.yml` | Lint, type-check, build, deploy frontend |

**Key Design Decision**: Coolify's auto-deploy webhooks are **disabled** on all 6 apps. Only GitHub Actions triggers deploys via Coolify API calls after CI passes. This prevents untested code from reaching production.

---

## Backend CI Workflow

**File**: `backend/.github/workflows/ci.yml`
**Triggers**: Pull requests to `main`, pushes to `main`
**Concurrency**: Cancels in-progress runs for the same branch

### Pipeline Jobs

The CI workflow (`ci.yml`) runs 5 jobs in sequence:

```
detect-changes → secrets-scan → lint-and-test → build-and-push → deploy (+ smoke test)
```

**Key features:**
- **Gitleaks secrets scan** runs before lint/test to catch exposed credentials
- **Turbo build step** catches TypeScript errors beyond what lint detects
- **All 4 backend services** are tested (auth, user, client, astro-engine)
- **GHCR image push** on main — tagged with `:{sha}` and `:latest`
- **Docker layer caching** via GitHub Actions cache
- **Post-deploy smoke tests** — waits 30s, then retries health endpoint 5x at 10s intervals
- **API Gateway** included in path detection, build, and deploy matrix
- **Root config changes** (`tsconfig.json`, `turbo.json`, `.eslintrc.js`) trigger contracts rebuild

### Path Filter Mapping

| Service | Triggers on changes to |
|---------|----------------------|
| contracts | `contracts/**`, `package.json`, `package-lock.json`, `tsconfig.json`, `turbo.json`, `.eslintrc.js` |
| auth | `services/auth-service/**`, `contracts/**`, `Dockerfile.auth` |
| user | `services/user-service/**`, `contracts/**`, `Dockerfile.user` |
| client | `services/client-service/**`, `contracts/**`, `Dockerfile.client` |
| astro-engine | `services/astro-engine/**`, `contracts/**`, `Dockerfile.astro-engine` |
| gateway | `services/api-gateway/**`, `contracts/**` |

### Deploy Matrix (5 services)

| Service | Coolify Secret | Health URL |
|---------|---------------|------------|
| auth | `COOLIFY_AUTH_UUID` | `https://api-auth.grahvani.in/health` |
| user | `COOLIFY_USER_UUID` | `https://api-user.grahvani.in/health` |
| client | `COOLIFY_CLIENT_UUID` | `https://api-client.grahvani.in/health` |
| astro-engine | `COOLIFY_ASTRO_UUID` | `https://api-astro.grahvani.in/health` |
| gateway | `COOLIFY_GATEWAY_UUID` | `https://api-gateway.grahvani.in/health` |

Deploy uses `max-parallel: 2` with retry logic (3 attempts, 10s between retries).

### Job Details

**Job 1: detect-changes**
- Uses `dorny/paths-filter@v3` to determine which services were modified
- Each service filter includes its own directory + `contracts/**` (shared dependency) + its Dockerfile
- Outputs a boolean per service (including gateway) and an `any-service` flag
- Root config files (`tsconfig.json`, `turbo.json`, `.eslintrc.js`) trigger contracts rebuild
- If no service code changed (e.g., only docs were updated), the entire pipeline skips

**Job 2: secrets-scan**
- Runs `gitleaks/gitleaks-action@v2` with full history (`fetch-depth: 0`)
- Detects hardcoded secrets, API keys, passwords in code and git history
- Blocks the pipeline if secrets are found
- Runs in parallel with `detect-changes`

**Job 3: lint-and-test**
- Requires both `detect-changes` and `secrets-scan` to pass
- Only runs if `any-service == 'true'`
- Generates all 3 Prisma clients (auth, user, client schemas)
- Builds contracts, then runs `npx turbo run build` (full type-check across all services)
- Runs ESLint across all services via Turborepo
- Runs Jest tests for all 4 services: auth-service, user-service, client-service, astro-engine

**Job 4: build-and-push**
- Builds Docker images for changed services
- Pushes to GHCR: `ghcr.io/<org>/<image>:{sha}` and `ghcr.io/<org>/<image>:latest`
- Uses Docker layer caching via GitHub Actions cache (`cache-from: type=gha`)
- 5-service matrix: auth, user, client, astro-engine, gateway

**Job 5: deploy**
- Requires `build-and-push` to succeed
- Deploys via `POST /api/v1/applications/{uuid}/restart` to Coolify API
- Retry logic: 3 attempts with 10s delay between retries
- Post-deploy smoke test: waits 30s, then checks health endpoint 5x at 10s intervals
- Fails the pipeline if the service doesn't become healthy

---

## Frontend CI Workflow

**File**: `frontend/.github/workflows/ci.yml`
**Triggers**: Pull requests to `main`, pushes to `main`
**Concurrency**: Cancels in-progress runs for the same branch

### Full Workflow YAML

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Lint
        continue-on-error: true
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_AUTH_SERVICE_URL: http://placeholder:3001/api/v1
          NEXT_PUBLIC_USER_SERVICE_URL: http://placeholder:3002/api/v1
          NEXT_PUBLIC_CLIENT_SERVICE_URL: http://placeholder:3008/api/v1

  deploy:
    needs: lint-and-build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy Frontend
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
            "http://147.93.30.201:8000/api/v1/applications/${{ secrets.COOLIFY_FRONTEND_UUID }}/restart" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_API_TOKEN }}")
          echo "Deploy frontend: HTTP $response"
          [ "$response" = "200" ] || exit 1
```

### Job Details

**Job 1: lint-and-build**
- `npm ci` — full install (frontend has no postinstall script issues)
- Lint runs with `continue-on-error: true` — lint warnings don't block the pipeline (the frontend codebase has existing lint issues being addressed incrementally)
- `npx tsc --noEmit` — strict TypeScript type checking without emitting files. This WILL fail the pipeline on type errors.
- `npm run build` — full Next.js production build. Uses **placeholder** `NEXT_PUBLIC_*` vars (the real URLs are injected at build time by Coolify, so CI just needs valid-shaped values to pass the build)

**Job 2: deploy**
- Only on push to `main`
- No path filtering — every push triggers a deploy (frontend is a single repo, no selective logic needed)
- Same Coolify API restart pattern as backend

---

## Health Monitor Workflow

**File**: `backend/.github/workflows/monitor.yml`
**Schedule**: Every 15 minutes (`*/15 * * * *`) + manual dispatch
**Purpose**: External health monitoring of all production endpoints

### Full Workflow YAML

```yaml
name: Health Monitor

on:
  schedule:
    - cron: '*/15 * * * *'
  workflow_dispatch:

jobs:
  check-health:
    runs-on: ubuntu-latest
    steps:
      - name: Check Auth Service
        run: |
          status=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://api-auth.grahvani.in/health" \
            --max-time 10)
          echo "Auth: $status"
          [ "$status" = "200" ] || exit 1

      - name: Check User Service
        run: |
          status=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://api-user.grahvani.in/health" \
            --max-time 10)
          echo "User: $status"
          [ "$status" = "200" ] || exit 1

      - name: Check Client Service
        run: |
          status=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://api-client.grahvani.in/health" \
            --max-time 10)
          echo "Client: $status"
          [ "$status" = "200" ] || exit 1

      - name: Check Astro Engine
        run: |
          status=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://api-astro.grahvani.in/health" \
            --max-time 10)
          echo "Astro Engine: $status"
          [ "$status" = "200" ] || exit 1

      - name: Check Frontend
        run: |
          status=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://grahvani.in/api/health" \
            --max-time 10)
          echo "Frontend: $status"
          [ "$status" = "200" ] || exit 1
```

### How It Works

- Runs from GitHub's infrastructure (external to KVM4) — simulates real user access
- Each check uses `curl --max-time 10` to timeout after 10 seconds
- Hits endpoints through Cloudflare (tests the full DNS → CDN → Traefik → Container path)
- If any check fails, the workflow fails — visible in GitHub Actions as a red badge
- Manual trigger: `gh workflow run monitor.yml -R Project-Corp-Astro/grahvani-backend`
- View results: `gh run list -R Project-Corp-Astro/grahvani-backend -w monitor.yml -L 10`

---

## GitHub Secrets

### Backend Repo (`Project-Corp-Astro/grahvani-backend`)

| Secret Name | Description | Where to find value |
|------------|-------------|---------------------|
| `COOLIFY_API_TOKEN` | Coolify API authentication token | `.env` file or Coolify dashboard > API tokens |
| `COOLIFY_AUTH_UUID` | Auth service Coolify app UUID | See 02-infrastructure.md resource inventory |
| `COOLIFY_USER_UUID` | User service Coolify app UUID | See 02-infrastructure.md resource inventory |
| `COOLIFY_CLIENT_UUID` | Client service Coolify app UUID | See 02-infrastructure.md resource inventory |
| `COOLIFY_ASTRO_UUID` | Astro Engine Coolify app UUID | See 02-infrastructure.md resource inventory |
| `COOLIFY_GATEWAY_UUID` | API Gateway Coolify app UUID | See 02-infrastructure.md resource inventory |

### Frontend Repo (`Project-Corp-Astro/frontend-grahvani-software`)

| Secret Name | Description | Where to find value |
|------------|-------------|---------------------|
| `COOLIFY_API_TOKEN` | Coolify API authentication token | `.env` file or Coolify dashboard > API tokens |
| `COOLIFY_FRONTEND_UUID` | Frontend Coolify app UUID | See 02-infrastructure.md resource inventory |

### Setting Secrets via CLI

> Get the actual values from the `.env` file or Coolify dashboard before running these commands.

```bash
# Backend
gh secret set COOLIFY_API_TOKEN -R Project-Corp-Astro/grahvani-backend -b "$COOLIFY_TOKEN"
gh secret set COOLIFY_AUTH_UUID -R Project-Corp-Astro/grahvani-backend -b "$AUTH_UUID"
gh secret set COOLIFY_USER_UUID -R Project-Corp-Astro/grahvani-backend -b "$USER_UUID"
gh secret set COOLIFY_CLIENT_UUID -R Project-Corp-Astro/grahvani-backend -b "$CLIENT_UUID"
gh secret set COOLIFY_ASTRO_UUID -R Project-Corp-Astro/grahvani-backend -b "$ASTRO_UUID"

# Frontend
gh secret set COOLIFY_API_TOKEN -R Project-Corp-Astro/frontend-grahvani-software -b "$COOLIFY_TOKEN"
gh secret set COOLIFY_FRONTEND_UUID -R Project-Corp-Astro/frontend-grahvani-software -b "$FRONTEND_UUID"
```

---

## Rollback Workflow

**File**: `backend/.github/workflows/rollback.yml`
**Trigger**: Manual dispatch only (`workflow_dispatch`)

### Usage

```bash
# Rollback auth-service to a specific commit
gh workflow run rollback.yml \
  -R Project-Corp-Astro/grahvani-backend \
  -f service=auth \
  -f sha=abc1234

# Available services: auth, user, client, astro-engine, gateway
```

### How It Works

1. Validates SHA format (7-40 hex characters)
2. Maps service name to GHCR image and Coolify UUID
3. Triggers Coolify restart (which pulls the tagged image from GHCR)
4. Runs post-rollback health check (30s wait + 5 retries at 10s intervals)

### Finding Available Image Tags

```bash
# List recent GHCR image tags for a service
gh api /orgs/Project-Corp-Astro/packages/container/grahvani-auth-service/versions \
  --jq '.[].metadata.container.tags[]' | head -20
```

---

## Selective Deploys (How Only Changed Services Rebuild)

Selective deploys work through **two layers**:

### Layer 1: GitHub Actions (`dorny/paths-filter`)
The CI workflow detects which files changed and sets boolean outputs per service. The deploy job only calls the Coolify restart API for services that actually changed.

### Layer 2: Coolify (`watch_paths`)
Even if CI triggers a restart, Coolify has its own `watch_paths` configured per app. This serves as a backup filter.

**Example scenario:**
1. Developer pushes changes to `services/auth-service/src/services/auth.service.ts`
2. `detect-changes` sets `auth=true`, all others `false`
3. `lint-and-test` runs (tests all services together)
4. `build-and-push` builds and pushes only auth-service image to GHCR
5. `deploy` matrix runs 5 jobs, but only auth's `if` condition is `true`
6. Only auth-service calls Coolify restart API and runs smoke test

**Special case: contracts/ changes**
If `contracts/**` is modified, ALL 5 services are marked as changed because contracts is a shared dependency. All 5 will rebuild (with `max-parallel: 2`).

---

## Branch Protection

| Rule | Backend | Frontend |
|------|---------|----------|
| Required status check | `lint-and-test` | `lint-and-build` |
| Direct push to main | Allowed with admin | Allowed with admin |
| PR required | Recommended | Recommended |
| Auto-merge | Not configured | Not configured |

---

## Pipeline Flow Diagram

```
                    PR to main                      Push to main
                       |                                |
                       v                                v
              detect-changes                   detect-changes
              (paths-filter)                   (paths-filter)
                       |                                |
                  secrets-scan                    secrets-scan
                  (gitleaks)                      (gitleaks)
                       |                                |
                       v                                v
              lint-and-test                    lint-and-test
           (build + lint + test)            (build + lint + test)
              |              |                          |
              v              v                          v
           PR Check       PR Check             build-and-push
           (pass/fail)   (block merge          (GHCR images)
                          if fail)                      |
                                                        v
                                                 deploy (matrix)
                                                 max-parallel: 2
                                                        |
                                        +-----+-----+-----+-----+
                                        |     |     |     |     |
                                       auth  user client astro gateway
                                      (only if changed in this push)
                                        |     |     |     |     |
                                        v     v     v     v     v
                                     Coolify restart API (3 retries)
                                        |     |     |     |     |
                                        v     v     v     v     v
                                     Smoke test (30s wait + 5 checks)
                                        |     |     |     |     |
                                        v     v     v     v     v
                                     Health check → Live
```

---

## Troubleshooting CI/CD

### CI fails on `npm ci`
- Check if `package-lock.json` is in sync with `package.json`
- Fix: `rm -rf node_modules package-lock.json && npm install && git add package-lock.json`

### Deploy step returns non-200
- Check if Coolify is reachable: `curl -s http://147.93.30.201:8000/api/v1/version`
- Check if the API token is valid: verify in GitHub repo Settings → Secrets
- Check Coolify logs for the specific app

### Lint step fails
- Backend: ESLint errors block the pipeline
- Frontend: `continue-on-error: true` — lint warnings are logged but don't block

### Tests fail
- Run locally first: `npx turbo run test --filter=@grahvani/auth-service`
- Check if environment variables are needed (tests should use `NODE_ENV=test`)

### Monitor shows failures
- Check if the service is actually down: `curl -s https://api-auth.grahvani.in/health`
- Could be a transient network issue from GitHub's runner to KVM4
- If persistent: check Coolify dashboard for container status
