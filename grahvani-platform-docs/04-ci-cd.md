# 4. CI/CD Pipeline

## Overview

Grahvani uses GitHub Actions for CI/CD across two repositories:

| Repository | Workflow | Purpose |
|-----------|---------|---------|
| `Project-Corp-Astro/grahvani-backend` | `ci.yml` | Lint, test, deploy 4 backend services |
| `Project-Corp-Astro/grahvani-backend` | `monitor.yml` | Health check all endpoints every 15 min |
| `Project-Corp-Astro/frontend-grahvani-software` | `ci.yml` | Lint, type-check, build, deploy frontend |

**Key Design Decision**: Coolify's auto-deploy webhooks are **disabled** on all 5 apps. Only GitHub Actions triggers deploys via Coolify API calls after CI passes. This prevents untested code from reaching production.

---

## Backend CI Workflow

**File**: `backend/.github/workflows/ci.yml`
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
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      contracts: ${{ steps.filter.outputs.contracts }}
      auth: ${{ steps.filter.outputs.auth }}
      user: ${{ steps.filter.outputs.user }}
      client: ${{ steps.filter.outputs.client }}
      astro-engine: ${{ steps.filter.outputs.astro-engine }}
      any-service: ${{ steps.filter.outputs.auth == 'true' || steps.filter.outputs.user == 'true' || steps.filter.outputs.client == 'true' || steps.filter.outputs.astro-engine == 'true' || steps.filter.outputs.contracts == 'true' }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            contracts:
              - 'contracts/**'
              - 'package.json'
              - 'package-lock.json'
            auth:
              - 'services/auth-service/**'
              - 'contracts/**'
              - 'Dockerfile.auth'
            user:
              - 'services/user-service/**'
              - 'contracts/**'
              - 'Dockerfile.user'
            client:
              - 'services/client-service/**'
              - 'contracts/**'
              - 'Dockerfile.client'
            astro-engine:
              - 'services/astro-engine/**'
              - 'contracts/**'
              - 'Dockerfile.astro-engine'

  lint-and-test:
    needs: detect-changes
    if: needs.detect-changes.outputs.any-service == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci --ignore-scripts

      - name: Generate Prisma clients
        run: |
          npx prisma generate --schema=services/auth-service/prisma/schema.prisma
          npx prisma generate --schema=services/user-service/prisma/schema.prisma
          npx prisma generate --schema=services/client-service/prisma/schema.prisma

      - name: Build contracts
        run: npx turbo run build --filter=@grahvani/contracts

      - name: Lint
        run: npx turbo run lint

      - name: Test
        run: |
          npx turbo run test \
            --filter=@grahvani/auth-service \
            --filter=@grahvani/user-service \
            --filter=@grahvani/astro-engine
        env:
          NODE_ENV: test

  deploy:
    needs: [detect-changes, lint-and-test]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    strategy:
      max-parallel: 2
      matrix:
        include:
          - service: auth
            uuid_secret: COOLIFY_AUTH_UUID
          - service: user
            uuid_secret: COOLIFY_USER_UUID
          - service: client
            uuid_secret: COOLIFY_CLIENT_UUID
          - service: astro-engine
            uuid_secret: COOLIFY_ASTRO_UUID
    steps:
      - name: Deploy ${{ matrix.service }}
        if: needs.detect-changes.outputs[matrix.service] == 'true'
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
            "http://147.93.30.201:8000/api/v1/applications/${{ secrets[matrix.uuid_secret] }}/restart" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_API_TOKEN }}")
          echo "Deploy ${{ matrix.service }}: HTTP $response"
          [ "$response" = "200" ] || exit 1
```

### Job Details

**Job 1: detect-changes**
- Uses `dorny/paths-filter@v3` to determine which services were modified
- Each service filter includes its own directory + `contracts/**` (shared dependency) + its Dockerfile
- Outputs a boolean per service and an `any-service` flag
- If no service code changed (e.g., only docs were updated), the entire pipeline skips

**Job 2: lint-and-test**
- Only runs if `any-service == 'true'`
- `npm ci --ignore-scripts` — installs dependencies without running postinstall scripts (faster, more predictable)
- Generates all 3 Prisma clients (auth, user, client schemas) — required for TypeScript compilation
- Builds the `contracts` package first (other services depend on it)
- Runs ESLint across all services via Turborepo
- Runs Jest tests for auth-service, user-service, and astro-engine
  - **client-service is excluded** because it has no tests yet
  - **astro-engine** runs with `--passWithNoTests` (no actual test files)

**Job 3: deploy**
- Only runs on push to `main` (not on PRs)
- Requires both `detect-changes` and `lint-and-test` to succeed
- Uses a matrix strategy with `max-parallel: 2` to limit simultaneous deploys
- Each matrix entry checks if its service changed before deploying
- Deploys via `POST /api/v1/applications/{uuid}/restart` to Coolify API
- Fails the job if Coolify returns non-200

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

## Selective Deploys (How Only Changed Services Rebuild)

Selective deploys work through **two layers**:

### Layer 1: GitHub Actions (`dorny/paths-filter`)
The CI workflow detects which files changed and sets boolean outputs per service. The deploy job only calls the Coolify restart API for services that actually changed.

**Path filter mapping:**
| Service | Triggers on changes to |
|---------|----------------------|
| auth | `services/auth-service/**`, `contracts/**`, `Dockerfile.auth` |
| user | `services/user-service/**`, `contracts/**`, `Dockerfile.user` |
| client | `services/client-service/**`, `contracts/**`, `Dockerfile.client` |
| astro-engine | `services/astro-engine/**`, `contracts/**`, `Dockerfile.astro-engine` |

### Layer 2: Coolify (`watch_paths`)
Even if CI triggers a restart, Coolify has its own `watch_paths` configured per app. This serves as a backup filter.

**Example scenario:**
1. Developer pushes changes to `services/auth-service/src/services/auth.service.ts`
2. `detect-changes` sets `auth=true`, all others `false`
3. `lint-and-test` runs (tests all services together)
4. `deploy` matrix runs 4 jobs, but only auth's `if` condition is `true`
5. Only auth-service calls Coolify restart API
6. Only auth-service rebuilds and redeploys

**Special case: contracts/ changes**
If `contracts/**` is modified, ALL 4 services are marked as changed because contracts is a shared dependency. All 4 will rebuild (with `max-parallel: 2`).

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
                       v                                v
              lint-and-test                    lint-and-test
           (if any service changed)         (if any service changed)
              |              |                          |
              v              v                          v
           PR Check       PR Check              deploy (matrix)
           (pass/fail)   (block merge           max-parallel: 2
                          if fail)                      |
                                           +-----+-----+-----+
                                           |     |     |     |
                                          auth  user client astro
                                        (only if changed in this push)
                                           |     |     |     |
                                           v     v     v     v
                                        Coolify restart API calls
                                           |     |     |     |
                                           v     v     v     v
                                        Docker rebuild + deploy
                                           |     |     |     |
                                           v     v     v     v
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
