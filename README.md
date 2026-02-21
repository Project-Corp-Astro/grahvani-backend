# Grahvani Backend

Vedic astrology SaaS platform — microservices backend with proper service isolation.

## Architecture Principles

| Principle | Implementation |
|-----------|----------------|
| **Service Autonomy** | Each service owns its own code, database schema, and DTOs |
| **Shared Events Only** | Only event schemas are shared (in `contracts/`) |
| **Independent Deployment** | Each service can be deployed separately |
| **API Gateway** | Single entry point for all frontend requests (Port 8080) |

## Folder Structure

```text
grahvani-backend/
├── contracts/                    # ONLY event definitions
│   └── src/events.ts             # Shared event schemas
│
├── services/                     # Independent microservices
│   ├── api-gateway/              # Port 8080 - Routes requests
│   ├── auth-service/             # Port 3001 - Authentication
│   ├── user-service/             # Port 3002 - User profiles
│   ├── content-service/          # Port 3003 - Blog/CMS
│   ├── search-service/           # Port 3004 - Meilisearch
│   ├── notification-service/     # Port 3005 - Email/SMS/Push
│   ├── realtime-service/         # Port 3006 - WebSocket
│   ├── media-service/            # Port 3007 - File uploads
│   ├── client-service/           # Port 3008 - CRM
│   ├── booking-service/          # Port 3009 - Appointments
│   ├── report-service/           # Port 3010 - PDF reports
│   ├── payment-service/          # Port 3011 - Razorpay/PhonePe
│   ├── wallet-service/           # Port 3012 - Credits
│   ├── learning-service/         # Port 3013 - Courses
│   ├── astro-engine/             # Port 3014 - Chart calculations
│   ├── ai-service/               # Port 3015 - Gemini AI
│   └── numerology-service/       # Port 3016 - Numerology
│
└── docker-compose.yml            # Local databases (Redis, Meilisearch)
```

## Service Structure (Each Service)

```text
service-name/
├── package.json
├── tsconfig.json
├── prisma/schema.prisma          # Own database schema
└── src/
    ├── main.ts                   # Entry point
    ├── config/                   # Configuration
    ├── dtos/                     # Request/Response types (OWNED)
    ├── services/                 # Business logic
    ├── interfaces/http/          # Controllers, routes
    └── errors/                   # Error classes
```

## Quick Start

```bash
# Start local infrastructure (DBs, Cache, Gateway)
docker-compose up -d

# Run auth-service
cd services/auth-service
npm install
npm run db:migrate
npm run dev
```

## Inter-Service Communication

| Type | Technology | Use Case |
|------|------------|----------|
| Sync | REST via Gateway | External API calls (Port 8080) |
| Async | Redis Pub/Sub | Events between services |
| Internal | HTTP | Service-to-service validation |

## Deployed Services

| Service | Port | Domain | Status |
|---------|------|--------|--------|
| Auth | 3001 | api-auth.grahvani.in | Deployed |
| User | 3002 | api-user.grahvani.in | Deployed |
| Client | 3008 | api-client.grahvani.in | Deployed |
| Astro Engine | 3014 | api-astro.grahvani.in | Deployed |
| API Gateway | 8080 | api-gateway.grahvani.in | Deployed |
| Frontend | 3000 | grahvani.in | Deployed |

## Documentation

Full platform documentation is in [`grahvani-platform-docs/`](./grahvani-platform-docs/):

| Doc | Description |
|-----|-------------|
| [01 - Architecture](./grahvani-platform-docs/01-architecture.md) | System design, data flow |
| [02 - Infrastructure](./grahvani-platform-docs/02-infrastructure.md) | Server, Coolify, DNS |
| [03 - Deployment](./grahvani-platform-docs/03-deployment.md) | Dockerfiles, Coolify config |
| [04 - CI/CD](./grahvani-platform-docs/04-ci-cd.md) | GitHub Actions, GHCR, rollback |
| [05 - Database](./grahvani-platform-docs/05-database.md) | PostgreSQL, Prisma, migrations |
| [06 - Services](./grahvani-platform-docs/06-services.md) | Endpoints, config per service |
| [07 - Environment](./grahvani-platform-docs/07-environment.md) | Env var reference |
| [08 - Monitoring](./grahvani-platform-docs/08-monitoring.md) | Health checks, Prometheus, Loki |
| [09 - Developer Guide](./grahvani-platform-docs/09-developer-guide.md) | Local setup, workflows |
| [10 - Troubleshooting](./grahvani-platform-docs/10-troubleshooting.md) | Common issues, runbook |
| [12 - Incident Response](./grahvani-platform-docs/12-incident-response.md) | Severity, diagnosis, rollback |
| [13 - On-Call Guide](./grahvani-platform-docs/13-on-call-guide.md) | Alert response, quick fixes |
