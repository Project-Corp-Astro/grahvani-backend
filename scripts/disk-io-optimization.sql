-- ============================================================================
-- DISK IO OPTIMIZATION SCRIPT
-- Run this in Supabase SQL Editor to reduce disk IO consumption
-- Date: 2026-02-06
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Index for chart queries by system (prevents full table scans)
CREATE INDEX IF NOT EXISTS "idx_client_saved_charts_system"
ON "client_saved_charts" ("system");

-- Composite index for chart lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS "idx_client_saved_charts_tenant_client_system"
ON "client_saved_charts" ("tenant_id", "client_id", "system");

-- Index for activity log cleanup queries
CREATE INDEX IF NOT EXISTS "idx_client_activity_logs_timestamp"
ON "client_activity_logs" ("timestamp");

-- Index for client generation status (used by recovery jobs)
CREATE INDEX IF NOT EXISTS "idx_clients_generation_status"
ON "clients" ("generation_status") WHERE "deleted_at" IS NULL;

-- ============================================================================
-- 2. ACTIVITY LOG ROTATION - DELETE LOGS OLDER THAN 90 DAYS
-- ============================================================================

-- Create a function to clean old activity logs (run weekly via cron)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete activity logs older than 90 days in batches of 10000
    WITH deleted AS (
        DELETE FROM client_activity_logs
        WHERE ctid IN (
            SELECT ctid FROM client_activity_logs
            WHERE timestamp < NOW() - INTERVAL '90 days'
            LIMIT 10000
        )
        RETURNING 1
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_activity_logs() IS
'Cleans up activity logs older than 90 days. Run weekly via pg_cron or call manually.';

-- ============================================================================
-- 3. IMMEDIATE CLEANUP - RUN THIS NOW TO FREE DISK SPACE
-- ============================================================================

-- Delete old activity logs (run multiple times if needed)
DO $$
DECLARE
    total_deleted INTEGER := 0;
    batch_deleted INTEGER := 1;
BEGIN
    WHILE batch_deleted > 0 LOOP
        WITH deleted AS (
            DELETE FROM client_activity_logs
            WHERE ctid IN (
                SELECT ctid FROM client_activity_logs
                WHERE timestamp < NOW() - INTERVAL '90 days'
                LIMIT 10000
            )
            RETURNING 1
        )
        SELECT COUNT(*) INTO batch_deleted FROM deleted;

        total_deleted := total_deleted + batch_deleted;
        RAISE NOTICE 'Deleted % old activity logs (total: %)', batch_deleted, total_deleted;
    END LOOP;

    RAISE NOTICE 'Cleanup complete. Total deleted: %', total_deleted;
END $$;

-- ============================================================================
-- 4. OPTIMIZE JSONB STORAGE
-- ============================================================================

-- Enable TOAST compression for large JSONB columns
ALTER TABLE "client_saved_charts"
ALTER COLUMN "chart_data" SET STORAGE EXTENDED;

-- ============================================================================
-- 5. VACUUM AND ANALYZE FOR IMMEDIATE OPTIMIZATION
-- ============================================================================

-- Reclaim space from deleted rows
VACUUM (VERBOSE, ANALYZE) "client_saved_charts";
VACUUM (VERBOSE, ANALYZE) "client_activity_logs";
VACUUM (VERBOSE, ANALYZE) "clients";

-- ============================================================================
-- 6. CHECK CURRENT TABLE SIZES
-- ============================================================================

SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
    pg_size_pretty(pg_table_size(schemaname || '.' || tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('client_saved_charts', 'client_activity_logs', 'clients', 'auth_users', 'auth_sessions')
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- ============================================================================
-- 7. OPTIONAL: SET UP WEEKLY CLEANUP (Requires pg_cron extension)
-- ============================================================================

-- Uncomment if pg_cron is available:
-- SELECT cron.schedule(
--     'cleanup-activity-logs',
--     '0 3 * * 0',  -- Every Sunday at 3 AM
--     $$SELECT cleanup_old_activity_logs()$$
-- );
