# 1. Architecture

## System Overview
Grahvani is a microservice-based platform with 5 deployed services + 2 databases, all running on a single KVM4 server managed by Coolify.

## Tech Stack

### Backend (Monorepo)
- Runtime: Node.js 22 (Alpine Docker)
- Language: TypeScript
- Framework: Express
- ORM: Prisma 6 with multiSchema
- Build: Turborepo + NPM Workspaces
- Testing: Jest
- Validation: Zod (auth-service)

### Frontend
- Framework: Next.js 16.1
- Language: TypeScript
- UI: React 19, Tailwind 4
- State: Zustand 5, TanStack Query 5
- Animation: Framer Motion
- Theme: Parchment/golden astrology theme

### Infrastructure
- Server: DigitalOcean Droplet (16 GB RAM)
- Container Management: Coolify
- Reverse Proxy: Traefik 3.6.7
- Database: PostgreSQL 16 (Alpine)
- Cache: Redis 7 (Alpine)
- Search: Meilisearch v1.6
- CI/CD: GitHub Actions
- DNS/CDN: Cloudflare

## Service Architecture Diagram

```
                          +----------------+
                          |   Cloudflare   |
                          |   DNS + SSL    |
                          +-------+--------+
                                  |
                          +-------+--------+
                          |    Traefik     |
                          |   (Reverse     |
                          |    Proxy)      |
                          +-------+--------+
                                  |
              +-------------------+-------------------+
              |                   |                    |
     +--------+--------+ +-------+--------+  +--------+--------+
     |    Frontend      | |   Backend      |  |   Backend       |
     |    (Next.js)     | |   Services     |  |   Services      |
     |    :3000         | |   Auth :3001   |  |   Astro :3014   |
     |    grahvani.in   | |   User :3002   |  |   api-astro.    |
     +-----------------+  |   Client:3008  |  |   grahvani.in   |
                          +-------+--------+  +--------+--------+
                                  |                    |
                     +------------+------------+       |
                     |            |            |       |
              +------+----+ +----+------+ +---+-----+ |
              |PostgreSQL | |   Redis   | |Meili-   | |
              |  :5432    | |   :6379   | |search   | |
              |(3 schemas)| |           | |  :7700  | |
              +-----------+ +-----------+ +---------+ |
                                                      |
                                           +----------+---------+
                                           | External Astro     |
                                           | Engine API         |
                                           | astroengine.       |
                                           | astrocorp.in       |
                                           +--------------------+
```

## Microservice Responsibilities

### Auth Service (port 3001)
- User registration and login (email + password)
- JWT token management (15min access, 7d refresh)
- Session management with device tracking
- Password reset flow
- OAuth support (Google, GitHub, Apple -- not yet active)
- Rate limiting (50 attempts/15min per email:IP)
- Login attempt auditing

### User Service (port 3002)
- User profile management (bio, avatar, social links)
- User preferences and settings
- Address management (multi-address)
- Activity logging
- Social graph (followers)
- Event publishing via Redis

### Client Service (port 3008)
- Astrologer's client CRM
- Client profiles with birth data
- Family relationship linking
- Consultation history tracking
- Saved chart management (204 chart types)
- Remedy prescription tracking
- Bulk client import
- Geocoding for birth places (OpenCage API)
- Full-text search (Meilisearch -- not yet wired)

### Astro Engine (port 3014)
- Proxy/cache layer to external Astro Engine API
- NO database -- Redis-only caching (24h TTL)
- Circuit breaker pattern (opossum)
- Rate limiting
- Health monitoring with degraded state detection
- Proxies to https://astroengine.astrocorp.in

### Frontend (port 3000)
- Next.js 16.1 App Router
- 40+ pages, 73+ components
- Parchment/golden astrology theme
- KP Horary charts, Dasha systems, Yoga analysis
- Client management UI
- Health endpoint at /api/health

## Data Flow

### Authentication Flow
1. User POST /api/v1/auth/login with email + password
2. Auth service checks Redis cache, falls back to PostgreSQL (app_auth schema)
3. bcrypt.compare password hash
4. Create session in DB, generate JWT (access + refresh)
5. Return tokens to frontend
6. Frontend stores tokens, sends Authorization: Bearer header
7. All services verify JWT using shared JWT_SECRET

### Chart Calculation Flow
1. Frontend requests chart via Client Service
2. Client Service calls Astro Engine service internally
3. Astro Engine checks Redis cache (24h TTL)
4. Cache miss: proxy to external https://astroengine.astrocorp.in
5. Cache result in Redis, return to Client Service
6. Client Service saves chart to PostgreSQL (app_clients schema)

## Monorepo Structure

```
grahvani-backend/
├── .github/workflows/     # CI + Monitor
├── contracts/             # Shared TypeScript types & events
├── services/
│   ├── auth-service/      # Authentication (Prisma: app_auth)
│   ├── user-service/      # User profiles (Prisma: app_users)
│   ├── client-service/    # Client CRM (Prisma: app_clients)
│   ├── astro-engine/      # Proxy/cache (no database)
│   ├── api-gateway/       # STUB -- not deployed
│   ├── ai-service/        # STUB
│   ├── booking-service/   # STUB
│   ├── content-service/   # STUB
│   ├── learning-service/  # STUB
│   ├── media-service/     # STUB
│   ├── notification-service/ # STUB
│   ├── numerology-service/   # STUB
│   ├── payment-service/      # STUB
│   ├── realtime-service/     # STUB
│   ├── report-service/       # STUB
│   ├── search-service/       # STUB
│   └── wallet-service/       # STUB
├── Dockerfile             # Generic multi-service builder
├── Dockerfile.auth        # Auth-specific
├── Dockerfile.user        # User-specific
├── Dockerfile.client      # Client-specific
├── Dockerfile.astro-engine # Astro-specific
├── docker-compose.yml     # Local dev (Redis + Meilisearch only)
├── docker-compose.prod.yml # Production reference
├── turbo.json             # Turborepo config
├── package.json           # Root workspace config
└── .env                   # Master env (gitignored)
```

Note: 13 stub services exist as placeholders for future development.

## Schema Isolation Strategy
All 3 database services share ONE PostgreSQL database but use separate schemas:
- `app_auth` -- 8 tables (users, sessions, tokens, OAuth, login attempts)
- `app_users` -- 5 tables (profiles, preferences, addresses, activity, followers)
- `app_clients` -- 8 tables (clients, family, consultations, charts, notes, remedies, imports, activity)
- `public` -- PostgreSQL default (extensions)

Benefits: Single backup/restore, single connection string, independent Prisma migrations per service.

## Inter-Service Communication
- Frontend to Backend: HTTPS via Cloudflare/Traefik
- Client Service to Astro Engine: HTTP internal Docker network
- All services to Redis: Internal Docker network
- All services to PostgreSQL: Internal Docker network
- Event system: Redis pub/sub (contracts/ defines event schemas)
