# Supabase & Prisma: Production Database Guidelines

> ⚠️ **PLATFORM CONSTRAINT**: Full stability with multiple concurrent services requires **Supabase Pro**. Free Tier has hard connection and CPU limits.

---

## 1. Environment Configuration

### Free Tier (Development)
```env
DATABASE_URL=postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
DIRECT_URL=postgresql://...@pooler.supabase.com:5432/postgres
```

### Pro Tier (Production)
```env
DATABASE_URL=postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=10
DIRECT_URL=postgresql://...@pooler.supabase.com:5432/postgres
```

---

## 2. Lazy Prisma Pattern (MANDATORY)

```typescript
// ✅ CORRECT - Lazy access inside methods
async findUser(id: string) {
  return getPrismaClient().user.findUnique({ where: { id } });
}

// ❌ WRONG - Eager access at module level
const prisma = getPrismaClient();
export const prisma = getPrismaClient();
```

---

## 3. PgBouncer Compatibility

| Feature | Supported | Notes |
| :--- | :--- | :--- |
| Simple queries | ✅ | Works normally |
| `$transaction([...])` | ❌ | Use sequential operations |
| Interactive transactions | ❌ | Not supported |
| Prepared statements | ❌ | Disabled by PgBouncer |

---

## 4. Free Tier Constraints

| Constraint | Impact |
| :--- | :--- |
| ~60 total connections | Shared across all developers |
| CPU throttling | Cold starts can take 10-30s |
| PgBouncer pool exhaustion | `Unable to check out connection` errors |

### Free Tier Workarounds
1. **Consolidate services** into a monolith for dev
2. **Use local PostgreSQL** for development
3. **Sequential startup** with delays between services

---

## 5. Code Review Checklist

- [ ] No `const prisma = getPrismaClient()` at module level
- [ ] No `$transaction` usage (use sequential ops)
- [ ] `getPrismaClient()` called inside methods only
- [ ] No DB calls in `server.ts` / `main.ts` startup
- [ ] `pgbouncer=true` in DATABASE_URL

---

> **Upgrade to Supabase Pro** for production and team development.

---
*Senior Architecture Team*
