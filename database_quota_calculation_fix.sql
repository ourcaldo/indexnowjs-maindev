-- CRITICAL FIX: Fix user_quota_summary view to calculate DAILY quota usage properly
-- This addresses the issue where total_quota_used was summing across all dates instead of daily usage

-- Drop the incorrect view
DROP VIEW IF EXISTS user_quota_summary;

-- Create the corrected view that properly calculates DAILY quota usage
CREATE VIEW user_quota_summary AS
SELECT 
    p.user_id,
    -- FIXED: Use daily_quota_used from user profile (accurate daily tracking)
    p.daily_quota_used as total_quota_used,
    COUNT(DISTINCT sa.id) as service_account_count,
    COUNT(DISTINCT sa.id) * 200 as total_quota_limit,
    -- Package information
    pkg.name as package_name,
    (pkg.quota_limits->>'daily_urls')::integer as daily_quota_limit,
    (pkg.quota_limits->>'service_accounts')::integer as service_accounts_limit,
    (pkg.quota_limits->>'concurrent_jobs')::integer as concurrent_jobs_limit,
    -- Daily quota usage from profile (most accurate)
    p.daily_quota_used,
    p.daily_quota_reset_date,
    -- Calculate if unlimited
    CASE WHEN (pkg.quota_limits->>'daily_urls')::integer = -1 THEN true ELSE false END as is_unlimited
FROM indb_auth_user_profiles p
LEFT JOIN indb_google_service_accounts sa ON sa.user_id = p.user_id AND sa.is_active = true
LEFT JOIN indb_payment_packages pkg ON pkg.id = p.package_id
GROUP BY 
    p.user_id, 
    p.daily_quota_used, 
    p.daily_quota_reset_date,
    pkg.name,
    pkg.quota_limits;

-- Grant access to the service role
GRANT SELECT ON user_quota_summary TO service_role;

-- ALSO FIX: Add user_id to indb_google_quota_usage table for proper tracking
-- Add user_id column to quota usage table if it doesn't exist
ALTER TABLE indb_google_quota_usage 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quota_usage_user_id ON indb_google_quota_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_quota_usage_date ON indb_google_quota_usage(date);

-- Update existing quota usage records to include user_id
-- This links existing quota records to the correct user via service account
UPDATE indb_google_quota_usage qu
SET user_id = sa.user_id
FROM indb_google_service_accounts sa
WHERE qu.service_account_id = sa.id 
AND qu.user_id IS NULL;

-- Create function to automatically set user_id when quota records are inserted
CREATE OR REPLACE FUNCTION set_quota_usage_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Get user_id from service account
    SELECT user_id INTO NEW.user_id
    FROM indb_google_service_accounts
    WHERE id = NEW.service_account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set user_id on quota usage inserts
DROP TRIGGER IF EXISTS trigger_set_quota_user_id ON indb_google_quota_usage;
CREATE TRIGGER trigger_set_quota_user_id
    BEFORE INSERT ON indb_google_quota_usage
    FOR EACH ROW
    EXECUTE FUNCTION set_quota_usage_user_id();

COMMENT ON VIEW user_quota_summary IS 'Fixed view that correctly shows DAILY quota usage instead of total across all dates';