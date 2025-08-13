-- SQL Queries for Rank Tracking Database Setup
-- Run these queries in Supabase SQL Editor

-- CORRECTED VERSION: Fixed integration table design and removed duplicate column additions

-- 1. Create Site Integration Table (for ScrapingDog API keys at SITE level)
-- This is a SITE-LEVEL configuration, not per-user like service accounts
-- The API key is configured at the project/site level, not per user
CREATE TABLE IF NOT EXISTS indb_site_integration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL DEFAULT 'scrapingdog',
    scrappingdog_apikey TEXT NOT NULL,
    api_quota_limit INTEGER DEFAULT 1000,
    api_quota_used INTEGER DEFAULT 0,
    quota_reset_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS on Site Integration (admin-only access)
ALTER TABLE indb_site_integration ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy for Site Integration (admin/super_admin only)
CREATE POLICY "Only admins can access site integrations" ON indb_site_integration
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- 4. Update Rank History Schema (Add device_type and country_id if not exists)
-- Note: These columns may already exist, so using IF NOT EXISTS to avoid errors
ALTER TABLE indb_keyword_rank_history 
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'desktop',
ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES indb_keyword_countries(id);

-- 5. Insert default ScrapingDog integration record (if not exists)
-- This creates a placeholder record that admins can update with the real API key
INSERT INTO indb_site_integration (service_name, scrappingdog_apikey, api_quota_limit, is_active)
SELECT 'scrapingdog', 'your_scrapingdog_api_key_here', 1000, false
WHERE NOT EXISTS (SELECT 1 FROM indb_site_integration WHERE service_name = 'scrapingdog');

-- NOTES:
-- - The `last_check_date` column already exists in `indb_keyword_keywords` table
-- - The rank history table `indb_keyword_rank_history` already exists
-- - The integration is at SITE level, not user level like service accounts
-- - Admin needs to update the API key and set is_active = true after running these queries