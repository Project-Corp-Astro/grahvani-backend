# 5. Database

## Overview
- Engine: PostgreSQL 16 (Alpine)
- Hosted: Self-hosted on KVM4 via Coolify
- Coolify UUID: nwwokgkgwgg04cok0wsc408g
- Memory: 1024m
- Single database: grahvani
- 3 isolated schemas + public

## Connection Details

### Production (Coolify internal network)
```
Host:     <container-uuid> (Docker internal hostname — see .env)
Port:     5432
User:     (see .env)
Password: (see .env)
Database: grahvani
URL:      (see DATABASE_URL in .env)
```

### External Access
```
Host:     147.93.30.201
Port:     5433
Note:     NOT publicly exposed by default (is_public=false)
```

To enable external access:
```bash
curl -X PATCH "http://147.93.30.201:8000/api/v1/databases/nwwokgkgwgg04cok0wsc408g" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_public": true}'
```

## Schema Isolation

### app_auth (auth-service)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| auth_users | User accounts | id (uuid), email (unique), password_hash, name, role, status, email_verified |
| auth_sessions | Login sessions | id, user_id, token_hash, refresh_token_hash, ip_address, device_type, expires_at |
| auth_login_attempts | Security audit | id, user_id, email, ip_address, success, failure_reason |
| auth_password_reset_tokens | Password reset | id, user_id, token_hash, expires_at, used |
| auth_email_verification_tokens | Email verify | id, user_id, token_hash, expires_at |
| auth_oauth_accounts | OAuth links | id, user_id, provider, provider_user_id |
| auth_token_blacklist | Token revocation | id, token_hash, token_type, expires_at |
| auth_invitation_tokens | Team invites | id, user_id, token_hash, expires_at |

Enums: UserRole (user/admin/moderator), UserStatus (active/suspended/pending_verification/deleted), TokenType, OAuthProvider

### app_users (user-service)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| users | User profiles | id, auth_user_id, email, name, bio, avatar_url, gender, date_of_birth |
| user_preferences | Settings | id, user_id, settings (JSON) |
| user_addresses | Multi-address | id, user_id, type, address fields |
| user_activity_logs | Audit trail | id, user_id, action, metadata |
| user_followers | Social graph | id, follower_id, following_id |

### app_clients (client-service)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| clients | Astrologer's clients | id, tenant_id, name, email, phone, birth data, tags (JSONB with GIN index) |
| client_family_links | Family relationships | id, client_id, related_client_id, relationship_type |
| client_consultations | Session history | id, client_id, type, date, duration, notes, fee |
| client_saved_charts | Cached charts | id, client_id, chart_type (204 types!), chart_data (JSON) |
| client_notes | Consultation notes | id, client_id, content, category |
| client_remedies | Remedy tracking | id, client_id, type, description, status |
| client_imports | Bulk imports | id, file_url, status, total_count, success_count |
| client_activity_logs | Audit trail | id, client_id, action, metadata |

## Prisma Configuration

All schemas use:
```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/prisma"
  binaryTargets   = ["native", "linux-musl-openssl-3.0.x"]
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas   = ["app_auth"]  // or app_users, app_clients
}
```

### CRITICAL: How Prisma Reads URLs
- **Prisma CLI** (migrate, push, generate, studio): reads `DATABASE_URL` and `DIRECT_URL` from env
- **Runtime** (application code): `db-pro.ts` overrides with `AUTH_DATABASE_URL`, `USER_DATABASE_URL`, or `CLIENT_DATABASE_URL` via `PrismaClient({ datasources: { db: { url } } })`
- The service-specific URLs add `?search_path=app_*,public`

## Prisma CLI Commands

### Generate clients (required before build)
```bash
# All at once
npm run prisma:generate

# Individual
npx prisma generate --schema=services/auth-service/prisma/schema.prisma
npx prisma generate --schema=services/user-service/prisma/schema.prisma
npx prisma generate --schema=services/client-service/prisma/schema.prisma
```

### Push schema to database (dev -- no migration files)
```bash
npx prisma db push --schema=services/auth-service/prisma/schema.prisma
npx prisma db push --schema=services/user-service/prisma/schema.prisma
npx prisma db push --schema=services/client-service/prisma/schema.prisma
```

### Create migration
```bash
npx prisma migrate dev --schema=services/auth-service/prisma/schema.prisma --name "add_some_field"
```

### Deploy migrations (production)
```bash
npx prisma migrate deploy --schema=services/auth-service/prisma/schema.prisma
```

### Open Prisma Studio (visual DB browser)
```bash
npx prisma studio --schema=services/auth-service/prisma/schema.prisma
# Opens at http://localhost:5555
```

### Introspect DB
```bash
npx prisma db pull --schema=services/auth-service/prisma/schema.prisma
```

## Direct SQL Access

### Via psql
```bash
psql "$DATABASE_URL"   # DATABASE_URL from .env
# Switch schema:
SET search_path TO app_auth;
\dt              -- list tables
\d auth_users    -- describe table
SELECT * FROM auth_users LIMIT 5;
```

### Via Docker
```bash
docker compose exec postgres psql -U grahvani -d grahvani
```

## Backups

### Schedule (Coolify-managed)
| Schedule | Cron | Retention | Purpose |
|----------|------|-----------|---------|
| Daily | 0 2 * * * (2 AM UTC) | 7 backups | Rolling daily |
| Weekly | 0 3 * * 0 (Sun 3 AM UTC) | 4 backups | Monthly archive |

### Backup Location
```
/data/coolify/backups/databases/root-team-0/grahvani-postgresql-nwwokgkgwgg04cok0wsc408g/
Format: pg-dump-grahvani-{timestamp}.dmp
```

### Check Backups via API
```bash
curl -s "http://147.93.30.201:8000/api/v1/databases/nwwokgkgwgg04cok0wsc408g/backups" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" | python3 -m json.tool
```

### Manual Backup
```bash
# SSH into server, then:
docker exec $(docker ps -q -f name=nwwokgkgwgg04cok0wsc408g) \
  pg_dump -U grahvani grahvani > backup-$(date +%Y%m%d).sql
```

### Restore from Backup
```bash
docker exec -i $(docker ps -q -f name=nwwokgkgwgg04cok0wsc408g) \
  psql -U grahvani grahvani < backup-20260211.sql
```

## Migration from Supabase
Completed February 2026. Key changes:
- Connection pooler (pgbouncer on port 6543) → direct connections (port 5432)
- Supabase managed PostgreSQL → self-hosted PostgreSQL 16 Alpine
- pgbouncer=true&statement_cache_size=0 params no longer needed
- PGSSLMODE changed from require to disable
- Connection limits no longer a concern (was 3 per service on free tier)
- Old Supabase credentials preserved in .env for reference

## DatabaseManager (db-pro.ts)
Each database service (auth, user, client) uses a singleton DatabaseManager:
- Lazy Prisma client initialization
- Health check every 30 seconds (SELECT 1)
- Auto-retry on transient failures (P1001, P1002, P1008, P1017, ECONNRESET)
- Transaction support with configurable timeout (default 5 min)
- Graceful shutdown on SIGINT/SIGTERM
- Connection metrics tracking
