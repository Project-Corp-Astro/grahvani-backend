-- Deduplication Script
-- Keep only the most recent record for each (tenant_id, client_id, chart_type, system)
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY tenant_id, client_id, chart_type, COALESCE(system, 'lahiri')
               ORDER BY calculated_at DESC, created_at DESC
           ) as row_num
    FROM app_clients.client_saved_charts
)
DELETE FROM app_clients.client_saved_charts
WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
);

-- Now safe to update NULLs
UPDATE app_clients.client_saved_charts 
SET system = 'lahiri' 
WHERE system IS NULL;
