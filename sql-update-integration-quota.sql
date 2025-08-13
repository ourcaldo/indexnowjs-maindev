-- SQL Commands to Update Integration Table Quota Settings
-- Run these commands in Supabase SQL Editor

-- Step 1: Update the existing record to set default quota to 1000 and make it active
UPDATE indb_site_integration 
SET 
    api_quota_limit = 1000,
    is_active = true,
    updated_at = now()
WHERE service_name = 'scrapingdog';

-- Step 2: Update table defaults for future records (optional)
ALTER TABLE indb_site_integration 
ALTER COLUMN api_quota_limit SET DEFAULT 1000;

ALTER TABLE indb_site_integration 
ALTER COLUMN is_active SET DEFAULT true;

-- Step 3: Verify the changes
SELECT 
    service_name, 
    scrappingdog_apikey,
    api_quota_limit,
    api_quota_used,
    is_active,
    quota_reset_date,
    updated_at
FROM indb_site_integration 
WHERE service_name = 'scrapingdog';