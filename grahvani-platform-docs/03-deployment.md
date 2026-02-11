# 3. Deployment

## How Services Are Deployed

Grahvani uses a CI/CD pipeline that flows from GitHub through GitHub Actions to Coolify:

```
Developer pushes code to GitHub (main branch)
         |
         v
GitHub Actions CI runs:
  1. Lint (ESLint)
  2. Test (Jest)
  3. Build (tsc)
         |
         v  (on success, for main branch only)
CI triggers Coolify restart via API call
         |
         v
Coolify pulls latest code from GitHub
         |
         v
Coolify builds Docker image using service-specific Dockerfile
         |
         v
Coolify stops old container, starts new container
         |
         v
Health check must pass before container is marked healthy
         |
         v
Traefik routes traffic to new container
```

### Step-by-Step Detail

1. **Code push**: Developer pushes to `main` branch on GitHub (org: `Project-Corp-Astro`).
2. **CI triggered**: GitHub Actions workflow runs lint, test, and build steps. If any step fails, the pipeline stops and no deploy happens.
3. **Deploy trigger**: On successful CI for the `main` branch, the workflow makes a POST request to the Coolify API to restart the relevant service.
4. **Code pull**: Coolify clones the latest code from the GitHub repository (using SSH deploy key).
5. **Docker build**: Coolify builds a new Docker image using the service-specific Dockerfile. Multi-stage build ensures only production artifacts end up in the final image.
6. **Container swap**: Coolify stops the old container and starts the new one. There is a brief period of downtime during this swap (typically 5-15 seconds).
7. **Health check**: The new container must pass the configured health check (HTTP GET to the health endpoint). If it fails after the configured retries, Coolify marks the deployment as failed.
8. **Traffic routing**: Once healthy, Traefik automatically routes traffic to the new container based on the subdomain Host header.

---

## Dockerfile Strategy

The backend monorepo uses **service-specific Dockerfiles** for each deployed service, plus a shared base pattern.

### Dockerfiles in the Repo

```
backend/
  Dockerfile.auth          # Auth Service
  Dockerfile.user          # User Service
  Dockerfile.client        # Client Service
  Dockerfile.astro-engine  # Astro Engine Service
```

Each Dockerfile can also be configured using build arguments if a more generic approach is needed:

| Build Arg | Purpose | Example |
|-----------|---------|---------|
| `SERVICE_NAME` | Which service package to build | `auth-service` |
| `ENTRY_FILE` | Entry point file for the service | `dist/src/server.js` |

### Multi-Stage Build Pattern

All Dockerfiles follow a 4-stage pattern:

```dockerfile
# Stage 1: deps -- install all dependencies (including devDependencies)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/*/package.json ...
RUN npm ci

# Stage 2: builder -- compile TypeScript
FROM deps AS builder
COPY . .
RUN npx turbo run build --filter=<service-name>

# Stage 3: pruner -- remove devDependencies, keep only production deps
FROM node:22-alpine AS pruner
WORKDIR /app
COPY --from=builder /app .
RUN npm prune --production

# Stage 4: runner -- minimal production image
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 grahvani && adduser -u 1001 -G grahvani -s /bin/sh -D grahvani
COPY --from=pruner /app .
USER grahvani
EXPOSE <port>
CMD ["node", "dist/src/server.js"]
```

### Service-Specific Notes

**Auth Service (Dockerfile.auth)**:
- Includes `npm rebuild bcrypt` in the deps stage because bcrypt has native C++ bindings that must be compiled for the Alpine Linux target
- Uses `tsc-alias` after TypeScript compilation to resolve path aliases (`@/...` imports) to relative paths in the compiled JavaScript
- Extra build time due to native module compilation (~30-45 seconds longer)

**Astro Engine (Dockerfile.astro-engine)**:
- Largest service (1024m memory limit)
- No native modules, straightforward build
- Handles the most computational work (chart calculations)

**Frontend (Next.js)**:
- Uses a separate Dockerfile in the frontend repo
- Next.js 16.1 with App Router
- Requires `NEXT_PUBLIC_*` environment variables at build time (set as `is_buildtime: true` in Coolify)
- Standalone output mode for optimized Docker images

### Common Base Image

All services use `node:22-alpine` as the base image:
- Alpine Linux for minimal image size (~120 MB vs ~900 MB for full Node images)
- Node.js 22 LTS for modern JavaScript/TypeScript features
- Non-root user `grahvani` (uid 1001) for security

---

## Coolify App Configuration

### Auth Service

| Setting | Value |
|---------|-------|
| UUID | `eg48400cgoc8cwocos8cosg8` |
| Git Repository | `Project-Corp-Astro/grahvani-backend` |
| Branch | `main` |
| Dockerfile | `Dockerfile.auth` |
| Build Pack | dockerfile |
| Exposed Port | 3001 |
| Domain | `https://api-auth.grahvani.in` |
| Memory Limit | 512m |
| Auto-deploy | Disabled (CI triggers deploys) |
| Watch Paths | `services/auth-service/**`, `contracts/**`, `package.json`, `Dockerfile.auth` |
| Health Check Path | `/health` |
| Health Check Port | 3001 |
| Health Check Interval | 30s |
| Health Check Timeout | 10s |
| Health Check Start Period | 40s |
| Health Check Retries | 3 |

### User Service

| Setting | Value |
|---------|-------|
| UUID | `jscos8kcwookg48ws8408o8g` |
| Git Repository | `Project-Corp-Astro/grahvani-backend` |
| Branch | `main` |
| Dockerfile | `Dockerfile.user` |
| Build Pack | dockerfile |
| Exposed Port | 3002 |
| Domain | `https://api-user.grahvani.in` |
| Memory Limit | 512m |
| Auto-deploy | Disabled (CI triggers deploys) |
| Watch Paths | `services/user-service/**`, `contracts/**`, `package.json`, `Dockerfile.user` |
| Health Check Path | `/health` |
| Health Check Port | 3002 |
| Health Check Interval | 30s |
| Health Check Timeout | 10s |
| Health Check Start Period | 40s |
| Health Check Retries | 3 |

### Client Service

| Setting | Value |
|---------|-------|
| UUID | `r8wwc4cggko40cs0cs8s8ogs` |
| Git Repository | `Project-Corp-Astro/grahvani-backend` |
| Branch | `main` |
| Dockerfile | `Dockerfile.client` |
| Build Pack | dockerfile |
| Exposed Port | 3008 |
| Domain | `https://api-client.grahvani.in` |
| Memory Limit | 512m |
| Auto-deploy | Disabled (CI triggers deploys) |
| Watch Paths | `services/client-service/**`, `contracts/**`, `package.json`, `Dockerfile.client` |
| Health Check Path | `/health` |
| Health Check Port | 3008 |
| Health Check Interval | 30s |
| Health Check Timeout | 10s |
| Health Check Start Period | 40s |
| Health Check Retries | 3 |

### Astro Engine

| Setting | Value |
|---------|-------|
| UUID | `qkgsko0kkoc004w0w04okggk` |
| Git Repository | `Project-Corp-Astro/grahvani-backend` |
| Branch | `main` |
| Dockerfile | `Dockerfile.astro-engine` |
| Build Pack | dockerfile |
| Exposed Port | 3014 |
| Domain | `https://api-astro.grahvani.in` |
| Memory Limit | 1024m |
| Auto-deploy | Disabled (CI triggers deploys) |
| Watch Paths | `services/astro-engine/**`, `contracts/**`, `package.json`, `Dockerfile.astro-engine` |
| Health Check Path | `/health` |
| Health Check Port | 3014 |
| Health Check Interval | 30s |
| Health Check Timeout | 10s |
| Health Check Start Period | 60s |
| Health Check Retries | 3 |

Note: Astro Engine has a longer `start_period` (60s vs 40s) because it pre-loads calculation tables on startup.

### Frontend

| Setting | Value |
|---------|-------|
| UUID | `lk0cksw804s4oc4c4o88ws48` |
| Git Repository | `Project-Corp-Astro/frontend-grahvani-software` |
| Branch | `main` |
| Dockerfile | `Dockerfile` |
| Build Pack | dockerfile |
| Exposed Port | 3000 |
| Domain | `https://grahvani.in` |
| Memory Limit | 768m |
| Auto-deploy | Disabled (CI triggers deploys) |
| Watch Paths | None (every push to main triggers) |
| Health Check Path | `/api/health` |
| Health Check Port | 3000 |
| Health Check Interval | 30s |
| Health Check Timeout | 10s |
| Health Check Start Period | 40s |
| Health Check Retries | 3 |

---

## Environment Variables in Coolify

### How Env Vars Are Managed

Environment variables are set through the Coolify dashboard or API. Each variable has two key properties:

- **`is_buildtime`**: If `true`, the variable is available during the Docker build stage (e.g., for `NEXT_PUBLIC_*` vars in the frontend). If `false`, it is only available at container runtime.
- **`is_preview`**: If `true`, the variable is only used in preview/PR deployments. For production, this is always `false`.

### Build-Time vs Runtime

| Variable Type | `is_buildtime` | Example |
|---------------|----------------|---------|
| Database URLs | `false` (runtime) | `DATABASE_URL`, `REDIS_URL` |
| API keys/secrets | `false` (runtime) | `JWT_SECRET`, `SUPABASE_KEY` |
| Service URLs | `false` (runtime) | `AUTH_SERVICE_URL` |
| Next.js public vars | `true` (build-time) | `NEXT_PUBLIC_API_URL` |
| Node environment | `false` (runtime) | `NODE_ENV=production` |

### Production vs Local Values

Production environment variables in Coolify differ from local `.env` files because services communicate over Docker's internal network:

```bash
# Local .env — uses localhost
DATABASE_URL=postgresql://<user>:<pass>@localhost:5432/grahvani
REDIS_URL=redis://localhost:6379
AUTH_SERVICE_URL=http://localhost:3001

# Coolify (production) — uses Docker internal container UUIDs as hostnames
DATABASE_URL=postgresql://<user>:<pass>@<postgres-container-uuid>:5432/grahvani
REDIS_URL=redis://default:<pass>@<redis-container-uuid>:6379
AUTH_SERVICE_URL=http://<auth-container-uuid>:3001
```

In Coolify, inter-service communication uses the container UUID as the hostname (Coolify sets up Docker DNS for this). All actual hostnames and credentials are in the `.env` file.

### Managing Env Vars via API

```bash
# Set COOLIFY_TOKEN from .env file or Coolify dashboard > API tokens
AUTH_HEADER="Authorization: Bearer $COOLIFY_TOKEN"
BASE_URL="http://147.93.30.201:8000/api/v1"

# List all env vars for Auth Service
curl -s "$BASE_URL/applications/eg48400cgoc8cwocos8cosg8/envs" \
  -H "$AUTH_HEADER" | jq '.[] | {key, value, is_buildtime}'

# Add a new runtime env var
curl -s -X POST "$BASE_URL/applications/eg48400cgoc8cwocos8cosg8/envs" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "NEW_VARIABLE",
    "value": "some_value",
    "is_buildtime": false,
    "is_preview": false
  }'
```

**Known Issue**: The API creates duplicate entries if you POST the same key that already exists. Always check with GET first. If the key already exists, update it through the Coolify dashboard instead.

---

## Manual Deploy (Emergency)

If CI/CD is broken or you need to force a deploy, trigger it manually via the Coolify API:

### Restart Individual Services

```bash
# Set COOLIFY_TOKEN from .env file or Coolify dashboard > API tokens
AUTH_HEADER="Authorization: Bearer $COOLIFY_TOKEN"
BASE_URL="http://147.93.30.201:8000/api/v1"

# Auth Service
curl -X POST "$BASE_URL/applications/eg48400cgoc8cwocos8cosg8/restart" \
  -H "$AUTH_HEADER"

# User Service
curl -X POST "$BASE_URL/applications/jscos8kcwookg48ws8408o8g/restart" \
  -H "$AUTH_HEADER"

# Client Service
curl -X POST "$BASE_URL/applications/r8wwc4cggko40cs0cs8s8ogs/restart" \
  -H "$AUTH_HEADER"

# Astro Engine
curl -X POST "$BASE_URL/applications/qkgsko0kkoc004w0w04okggk/restart" \
  -H "$AUTH_HEADER"

# Frontend
curl -X POST "$BASE_URL/applications/lk0cksw804s4oc4c4o88ws48/restart" \
  -H "$AUTH_HEADER"
```

### Restart All Backend Services

```bash
# Set COOLIFY_TOKEN from .env file or Coolify dashboard > API tokens
AUTH_HEADER="Authorization: Bearer $COOLIFY_TOKEN"
BASE_URL="http://147.93.30.201:8000/api/v1"

for UUID in eg48400cgoc8cwocos8cosg8 jscos8kcwookg48ws8408o8g r8wwc4cggko40cs0cs8s8ogs qkgsko0kkoc004w0w04okggk; do
  echo "Restarting $UUID..."
  curl -s -X POST "$BASE_URL/applications/$UUID/restart" -H "$AUTH_HEADER"
  echo ""
  sleep 2
done
```

### Verify Deployment Health

After triggering a deploy, verify each service is healthy:

```bash
# Check each service health endpoint
curl -s https://api-auth.grahvani.in/health | jq .
curl -s https://api-user.grahvani.in/health | jq .
curl -s https://api-client.grahvani.in/health | jq .
curl -s https://api-astro.grahvani.in/health | jq .
curl -s https://grahvani.in | head -20
```

---

## Rollback Strategy

**There is currently no built-in rollback mechanism.** Coolify does not maintain previous Docker images or provide a one-click rollback feature.

### How to Roll Back

If a deployment introduces a bug or breaks a service, the rollback process is:

1. **Identify the bad commit** on the `main` branch.
2. **Revert the commit** in Git:
   ```bash
   git revert <bad-commit-hash>
   git push origin main
   ```
3. **Wait for CI/CD** to pick up the revert commit and trigger a new deploy.
4. **Verify** the service is healthy after the revert deploys.

### Emergency Rollback (Faster)

If CI/CD is too slow, manually trigger after the revert:

```bash
# After git revert and push:
curl -X POST "http://147.93.30.201:8000/api/v1/applications/<UUID>/restart" \
  -H "Authorization: Bearer $COOLIFY_TOKEN"
```

### Limitations

- **No instant rollback**: Every rollback requires a full Docker rebuild (2-5 minutes depending on the service).
- **No image registry**: Built images are not pushed to a registry. Each deploy builds from source.
- **Database migrations**: If the bad commit included a Prisma migration, the revert must also include a down migration. Prisma does not auto-rollback migrations.
- **Downtime window**: There is a brief downtime (5-15 seconds) during each container swap.

### Future Improvement

Consider pushing Docker images to a registry (GitHub Container Registry or DigitalOcean Container Registry) so that rollbacks can be instant by redeploying a previous image tag without rebuilding.

---

## Frontend Deployment

The frontend follows the same CI/CD pipeline as backend services but with some differences:

### Key Differences

1. **Separate repository**: `Project-Corp-Astro/frontend-grahvani-software` (not the backend monorepo).
2. **No path filtering**: Every push to `main` triggers a build and deploy. There are no watch paths like the backend services.
3. **Build-time env vars required**: `NEXT_PUBLIC_*` variables must be set as `is_buildtime: true` in Coolify because Next.js inlines them during the build.
4. **Longer build times**: Next.js builds are typically 2-4 minutes due to static generation and optimization.

### Build-Time Environment Variables

These MUST be set as `is_buildtime: true` in Coolify for the frontend:

```
NEXT_PUBLIC_API_AUTH_URL=https://api-auth.grahvani.in
NEXT_PUBLIC_API_USER_URL=https://api-user.grahvani.in
NEXT_PUBLIC_API_CLIENT_URL=https://api-client.grahvani.in
NEXT_PUBLIC_API_ASTRO_URL=https://api-astro.grahvani.in
NEXT_PUBLIC_APP_URL=https://grahvani.in
```

If these are set as runtime-only, the frontend will build with `undefined` values and API calls will fail.

### Frontend Deploy Command

```bash
# Trigger frontend deploy
curl -X POST "http://147.93.30.201:8000/api/v1/applications/lk0cksw804s4oc4c4o88ws48/restart" \
  -H "Authorization: Bearer $COOLIFY_TOKEN"
```

---

## Deployment Checklist

Use this checklist when deploying changes:

### Pre-Deploy
- [ ] All tests pass locally (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] If adding new env vars: add them in Coolify BEFORE deploying
- [ ] If Prisma schema changed: migration has been created and tested locally
- [ ] If adding a new `NEXT_PUBLIC_*` var: set as `is_buildtime: true` in Coolify

### Deploy
- [ ] Push to `main` branch
- [ ] CI pipeline passes (check GitHub Actions)
- [ ] Coolify shows deployment in progress

### Post-Deploy
- [ ] Health endpoint returns 200 for affected service(s)
- [ ] Smoke test critical functionality (login, chart generation, client lookup)
- [ ] Check Coolify logs for any errors: Dashboard -> Application -> Logs
- [ ] If database migration was included: verify schema is correct

### If Something Goes Wrong
- [ ] Check Coolify deployment logs for build or startup errors
- [ ] Check the service health endpoint directly
- [ ] If the service is down: check if it is an OOM kill (memory limit too low)
- [ ] If the build failed: check if a new devDependency was added but not in the Dockerfile
- [ ] To rollback: `git revert <commit>` and push to `main`
