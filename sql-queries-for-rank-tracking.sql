-- SQL queries required for IndexNow Rank Tracking Backend Implementation
-- Run these queries in Supabase SQL Editor

-- 1. Create ScrapingDog API Integration Table
CREATE TABLE indb_site_integration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL DEFAULT 'scrapingdog',
    scrappingdog_apikey TEXT NOT NULL,
    api_quota_limit INTEGER DEFAULT 10000,
    api_quota_used INTEGER DEFAULT 0,
    quota_reset_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, service_name)
);

-- 2. Enable RLS for API Integration Table
ALTER TABLE indb_site_integration ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy for API Integration
CREATE POLICY "Users can only access their own integrations" ON indb_site_integration
    FOR ALL USING (auth.uid() = user_id);

-- 4. Update Rank History Schema (Add device_type and country_id if not exists)
ALTER TABLE indb_keyword_rank_history 
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'desktop',
ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES indb_keyword_countries(id);

-- 4.1. Update Keywords Schema (Add last_check_date if not exists)
ALTER TABLE indb_keyword_keywords 
ADD COLUMN IF NOT EXISTS last_check_date DATE;

-- 5. Update existing rank history records with device_type and country_id from keywords table
UPDATE indb_keyword_rank_history 
SET device_type = k.device_type, country_id = k.country_id
FROM indb_keyword_keywords k 
WHERE indb_keyword_rank_history.keyword_id = k.id
AND (indb_keyword_rank_history.device_type IS NULL OR indb_keyword_rank_history.country_id IS NULL);

-- 6. Create index for better performance on rank tracking queries
CREATE INDEX IF NOT EXISTS idx_keyword_last_check_date ON indb_keyword_keywords(last_check_date, is_active);
CREATE INDEX IF NOT EXISTS idx_rank_history_check_date ON indb_keyword_rank_history(check_date);
CREATE INDEX IF NOT EXISTS idx_site_integration_user_service ON indb_site_integration(user_id, service_name);

-- 7. Grant necessary permissions
GRANT ALL ON indb_site_integration TO authenticated;
GRANT ALL ON indb_site_integration TO service_role;

-- Verification Queries (Run these to verify the setup)
-- Check if table was created successfully
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'indb_site_integration' 
ORDER BY ordinal_position;

-- Check if indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('indb_keyword_keywords', 'indb_keyword_rank_history', 'indb_site_integration');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'indb_site_integration';