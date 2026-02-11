# 9. Developer Guide

## Prerequisites
- Node.js 20+ (recommend using nvm)
- Docker Desktop (for Redis, Meilisearch, optional PostgreSQL)
- Git
- GitHub CLI (gh) — for repo access and CI monitoring
- psql (optional, for direct DB access)
- VS Code (recommended)

---

## First-Time Setup

### 1. Clone the repositories
```bash
# Backend (monorepo with all microservices)
git clone https://github.com/Project-Corp-Astro/grahvani-backend.git
cd grahvani-backend

# Frontend (separate repo)
git clone https://github.com/Project-Corp-Astro/frontend-grahvani-software.git
```

### 2. Get the .env file
The `.env` file is gitignored and contains all secrets. Get it from:
- Another team member
- The master copy at: `/Users/dr.tumulraathi/AstroCorp/APPS/Grahvani/backend/.env`
- Or create from `.env.example` and fill in real values

Place it at the root of the backend repo: `grahvani-backend/.env`

### 3. Install dependencies
```bash
# Backend
cd grahvani-backend
npm install

# Frontend
cd frontend-grahvani-software
npm install
```

### 4. Start local infrastructure
```bash
# Start Redis and Meilisearch (from backend repo root)
docker compose up -d

# Verify they're running
docker compose ps
# redis:    0.0.0.0:6379->6379/tcp
# meilisearch: 0.0.0.0:7700->7700/tcp
```

### 5. Set up the database

You have 3 options for database access:

**Option A: Connect to production DB (simplest)**
Enable public access on the Coolify PostgreSQL using the Coolify API (see `.env` Section 10 for the token and DB UUID). Then uncomment Option A in the `.env` file (Section 2).

Port 5433 is only available when `is_public: true` is set on the Coolify database.

**Option B: SSH tunnel (more secure)**
```bash
ssh -L 5433:<postgres-container-uuid>:5432 root@147.93.30.201
```
Get the container UUID from the `.env` file (Section 2). Then uncomment Option B in the `.env` file.

**Option C: Local PostgreSQL**
```bash
docker run -d --name grahvani-pg \
  -e POSTGRES_USER=grahvani \
  -e POSTGRES_PASSWORD=<your-local-password> \
  -e POSTGRES_DB=grahvani \
  -p 5432:5432 \
  postgres:16-alpine
```
Then push schemas:
```bash
npx prisma db push --schema=services/auth-service/prisma/schema.prisma
npx prisma db push --schema=services/user-service/prisma/schema.prisma
npx prisma db push --schema=services/client-service/prisma/schema.prisma
```

### 6. Generate Prisma clients
```bash
npm run prisma:generate
```

### 7. Run the services
```bash
# All services at once (via Turborepo)
npm run dev

# Or run individually:
npm run dev --workspace=@grahvani/auth-service
npm run dev --workspace=@grahvani/user-service
npm run dev --workspace=@grahvani/client-service
npm run dev --workspace=@grahvani/astro-engine
```

### 8. Verify everything works
```bash
# Health checks
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # User
curl http://localhost:3008/health  # Client
curl http://localhost:3014/health  # Astro Engine

# Test login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"YourPassword"}'
```

---

## Development Workflow

### Feature Development
```
1. Create a feature branch: git checkout -b feature/my-feature
2. Make changes in the relevant service(s)
3. Run linting: npx turbo run lint
4. Run tests: npx turbo run test
5. Commit and push: git push -u origin feature/my-feature
6. Open PR to main -> CI runs automatically
7. Get review -> merge to main -> auto-deploys changed services
```

### Which Service to Edit?
| Feature | Service | Directory |
|---------|---------|-----------|
| Login, signup, password reset | auth-service | services/auth-service/ |
| User profiles, preferences | user-service | services/user-service/ |
| Client management, charts | client-service | services/client-service/ |
| Chart calculation caching | astro-engine | services/astro-engine/ |
| Shared types/events | contracts | contracts/ |
| Web UI | frontend | (separate repo) |

### Adding a New API Endpoint

Example: Adding a new endpoint to auth-service:

1. **Define route** in `services/auth-service/src/interfaces/http/routes/auth.routes.ts`
2. **Add controller** in `services/auth-service/src/interfaces/http/controllers/auth.controller.ts`
3. **Add service logic** in `services/auth-service/src/services/auth.service.ts`
4. **Add Zod validation** in `services/auth-service/src/interfaces/http/validators/auth.validator.ts`
5. **Write test** in `services/auth-service/src/__tests__/`

### Adding a New Database Table

1. Edit the Prisma schema: `services/{service}/prisma/schema.prisma`
2. Push to DB: `npx prisma db push --schema=services/{service}/prisma/schema.prisma`
3. Regenerate client: `npx prisma generate --schema=services/{service}/prisma/schema.prisma`
4. Use the new model in service code

### Modifying Shared Contracts

1. Edit `contracts/src/events.ts`
2. Build: `npx turbo run build --filter=@grahvani/contracts`
3. Services that depend on contracts will auto-rebuild

---

## Testing

### Run all tests
```bash
npx turbo run test
```

### Run service-specific tests
```bash
npx turbo run test --filter=@grahvani/auth-service
npx turbo run test --filter=@grahvani/user-service
npx turbo run test --filter=@grahvani/astro-engine
```

### Test framework
- Jest with ts-jest preset
- Test files in: `services/{service}/src/__tests__/`
- Pattern: `**/__tests__/**/*.test.ts`

### Current test coverage
- auth-service: 1 test file (production-lifecycle.test.ts)
- user-service: 1 test file (user-sync.test.ts)
- client-service: NO tests
- astro-engine: runs with --passWithNoTests (no actual tests)

---

## Prisma Cheat Sheet

```bash
# Generate all clients
npm run prisma:generate

# Push schema (no migration files)
npx prisma db push --schema=services/auth-service/prisma/schema.prisma

# Create migration
npx prisma migrate dev --schema=services/auth-service/prisma/schema.prisma --name "description"

# Visual DB browser
npx prisma studio --schema=services/auth-service/prisma/schema.prisma

# Pull schema from DB
npx prisma db pull --schema=services/auth-service/prisma/schema.prisma

# Check migration status
npx prisma migrate status --schema=services/auth-service/prisma/schema.prisma
```

### Important Prisma Notes
- Prisma CLI reads `DATABASE_URL` and `DIRECT_URL` from the schema's env() — NOT from service-specific URLs
- `multiSchema` preview feature is enabled — each service uses its own PostgreSQL schema
- Binary targets include `linux-musl-openssl-3.0.x` for Docker Alpine compatibility
- Generated client output: `../src/generated/prisma` (relative to schema file)

---

## Useful Commands

### Backend
```bash
npm run dev              # Start all services
npm run build            # Build all (includes prisma:generate)
npm run lint             # Lint all services (via turbo)
npm run test             # Test all services (via turbo)
npm run prisma:generate  # Generate Prisma clients
```

### Frontend
```bash
npm run dev      # Start Next.js dev server (port 3000)
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # Type check only
```

### Docker
```bash
docker compose up -d      # Start Redis + Meilisearch
docker compose down       # Stop
docker compose logs -f    # View logs
```

### GitHub CLI
```bash
gh pr create                    # Create PR
gh pr list                      # List PRs
gh run list -w ci.yml -L 5     # Recent CI runs
gh run list -w monitor.yml -L 5 # Recent health checks
gh workflow run monitor.yml     # Manual health check
```

---

## Project Conventions

### Code Style
- TypeScript strict mode
- ESLint configured per service
- Prettier (where configured)
- Tabs/spaces: per ESLint config

### Git Conventions
- Branch from main
- PR to main for all changes
- CI must pass before merge
- Commit messages: descriptive, imperative mood

### File Organization
- Routes: `src/interfaces/http/routes/`
- Controllers: `src/interfaces/http/controllers/`
- Services: `src/services/`
- Config: `src/config/`
- Tests: `src/__tests__/`
- Generated Prisma: `src/generated/prisma/`

---

## Test Accounts

Test accounts exist in the production database. Get credentials from:
- The master `.env` file (see `TEST_ACCOUNTS` section)
- Or ask a team member

| Email | Name | Status |
|-------|------|--------|
| chandukomera999@gmail.com | Chandu Komera | Active |
| gouthamkadumuru@gmail.com | Goutham Kadumuru | Active |

### Testing Login
```bash
# Against production
curl -X POST https://api-auth.grahvani.in/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chandukomera999@gmail.com","password":"<password>"}'

# Against local
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chandukomera999@gmail.com","password":"<password>"}'
```

### Creating New Test Accounts
```bash
curl -X POST https://api-auth.grahvani.in/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"YourSecurePassword","name":"New User"}'
```

Note: Do not use production test accounts for automated CI tests. Create separate test fixtures for CI.
