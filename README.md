# Grahvani Backend

Enterprise microservices backend using **proper service isolation**.

## Architecture Principles

| Principle | Implementation |
|-----------|----------------|
| **Service Autonomy** | Each service owns its own code, database schema, and DTOs |
| **Shared Events Only** | Only event schemas are shared (in `contracts/`) |
| **Independent Deployment** | Each service can be deployed separately |
| **API Gateway** | Single entry point for all frontend requests |

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
# Start local databases
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
| Sync | REST via Gateway | External API calls |
| Async | Redis Pub/Sub | Events between services |
| Internal | HTTP | Service-to-service validation |
