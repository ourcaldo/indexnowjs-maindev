-- SQL to fix the existing indb_site_integration table structure
-- Run these queries in Supabase SQL Editor to convert from user-level to site-level

-- 1. First, delete any existing data to avoid conflicts
DELETE FROM indb_site_integration;

-- 2. Drop the user_id column and related constraints
ALTER TABLE indb_site_integration 
DROP CONSTRAINT IF EXISTS indb_site_integration_user_id_fkey,
DROP COLUMN IF EXISTS user_id;

-- 3. Drop the old unique constraint if it exists
DROP INDEX IF EXISTS indb_site_integration_user_id_service_name_key;

-- 4. Update the RLS policy to be admin-only
DROP POLICY IF EXISTS "Users can only access their own integrations" ON indb_site_integration;

CREATE POLICY "Only admins can access site integrations" ON indb_site_integration
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- 5. Insert the default ScrapingDog integration record
INSERT INTO indb_site_integration (service_name, scrappingdog_apikey, api_quota_limit, is_active)
VALUES ('scrapingdog', 'your_scrapingdog_api_key_here', 1000, false);

-- 6. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_site_integration_service_active 
ON indb_site_integration(service_name, is_active);

-- NOTES:
-- - This converts the table from user-level to site-level configuration
-- - Admin needs to update the API key and set is_active = true
-- - The integration is now managed at project/site level, not per user