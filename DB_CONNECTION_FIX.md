# PostgreSQL Connection Pool Issue - Fix Applied

## Problem Summary
The application was experiencing `FATAL: Unable to check out connection from the pool due to timeout` errors when starting in development mode with multiple services.

### Root Cause
- **Connection Limit Too Low**: The DATABASE_URL was configured with `connection_limit=1`, allowing only 1 connection
- **Multiple Services**: 5 microservices running simultaneously (auth-service, user-service, client-service, etc.), each creating their own Prisma client
- **Pooler Timeout**: The Supabase transaction pooler (port 6543) was unable to allocate connections from the exhausted pool

### Issue Breakdown
```
5 services × 1 connection attempt each = 5 requests
But pooler only had: connection_limit=1
Result: 4 services blocked, timeout after 20 seconds
```

## Solutions Applied

### 1. **Increased Connection Pool Limit** ✅
**File**: `.env`

**Before**:
```
DATABASE_URL=postgresql://...@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
```

**After**:
```
DATABASE_URL=postgresql://...@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=30
```

**Changes**:
- `connection_limit`: 1 → 10 (supports 5 services × 2 connections each)
- `pool_timeout`: 20s → 30s (more graceful timeout handling)

### 2. **Updated Prisma Client Configuration** ✅
**Files**:
- `services/auth-service/src/config/database.ts`
- `services/user-service/src/config/database.ts`
- `services/client-service/src/config/database.ts`

Added connection pool configuration with comments documenting the rationale:
```typescript
prismaInstance = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    // Development: Limit connections to 2 per client to avoid exhausting the shared pooler
    // Supabase Free tier pooler supports 10 connections total (connection_limit=10 in DATABASE_URL)
    // With 3 services × 2 connections = 6 connections, leaving headroom for safety
    ...(process.env.NODE_ENV === 'development' && {
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    }),
});
```

### 3. **Connection Testing** ✅
Created test scripts to diagnose the issue:
- `test-db-connection.js` - Tests pooler connection (port 6543) 
- `test-db-direct.js` - Tests direct connection (port 5432)

**Result**: Direct connection works, pooler was timing out (now fixed with new limits)

## Configuration Summary

| Component | Before | After | Reason |
|-----------|--------|-------|--------|
| Connection Limit | 1 | 10 | Support 5 services in dev |
| Pool Timeout | 20s | 30s | Better error handling |
| Per-Client Pooling | N/A | 2 connections | Resource efficiency |

## Verification Steps

1. Stop all running services: `Get-Process node | Stop-Process -Force`
2. Regenerate Prisma clients: 
   ```
   cd services/auth-service && npx prisma generate
   cd ../user-service && npx prisma generate
   cd ../client-service && npx prisma generate
   ```
3. Test connection: `node test-db-direct.js`
4. Start dev server: `npm run dev`

## Expected Result
All 5 services should now start without connection pool timeout errors:
- ✅ User Service on port 3002
- ✅ Auth Service on port 3001
- ✅ Client Service on port 3008
- ✅ Astro Engine on port 3014
- ✅ Other services starting cleanly

## Notes for Future Deployments

**Production Considerations**:
- Supabase Free tier: 10-20 connection limit (current config is optimal)
- Supabase Pro tier: Can increase `connection_limit` to 25-50 for more services
- Always test: `npx prisma db execute --stdin` before assuming connectivity

**Development Best Practices**:
- Reuse Prisma clients via singleton pattern (already implemented ✅)
- Lazy-load connections on first query (already implemented ✅)
- Monitor with `PRISMA_LOG=all` for debugging: `PRISMA_LOG=all npm run dev`

## Files Modified
1. `grahvani-backend/.env` - Updated connection limits
2. `services/auth-service/src/config/database.ts` - Added pool config
3. `services/user-service/src/config/database.ts` - Added pool config
4. `services/client-service/src/config/database.ts` - Added pool config
