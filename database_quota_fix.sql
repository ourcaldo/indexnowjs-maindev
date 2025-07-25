-- Database fix for quota tracking and user linkage
-- This script updates the user_quota_summary view to properly calculate daily quota usage

-- First, ensure the user_quota_summary view calculates real quota usage
DROP VIEW IF EXISTS user_quota_summary;

CREATE VIEW user_quota_summary AS
SELECT 
    up.user_id,
    COALESCE(daily_usage.total_quota_used, 0) AS total_quota_used,
    COALESCE(sa_count.service_account_count, 0) AS service_account_count,
    COALESCE(sa_limits.total_quota_limit, 0) AS total_quota_limit
FROM indb_auth_user_profiles up
LEFT JOIN (
    -- Calculate daily quota usage from actual Google API requests
    SELECT 
        sa.user_id,
        SUM(qu.requests_successful) AS total_quota_used
    FROM indb_google_quota_usage qu
    INNER JOIN indb_google_service_accounts sa ON qu.service_account_id = sa.id
    WHERE qu.date = CURRENT_DATE
    GROUP BY sa.user_id
) daily_usage ON up.user_id = daily_usage.user_id
LEFT JOIN (
    -- Count active service accounts per user
    SELECT 
        user_id,
        COUNT(*) AS service_account_count
    FROM indb_google_service_accounts
    WHERE is_active = true
    GROUP BY user_id
) sa_count ON up.user_id = sa_count.user_id
LEFT JOIN (
    -- Calculate total quota limits per user
    SELECT 
        user_id,
        SUM(daily_quota_limit) AS total_quota_limit
    FROM indb_google_service_accounts
    WHERE is_active = true
    GROUP BY user_id
) sa_limits ON up.user_id = sa_limits.user_id;

-- Grant proper permissions to the view
GRANT SELECT ON user_quota_summary TO authenticated;
GRANT SELECT ON user_quota_summary TO service_role;

-- Create index on user_id for better performance
CREATE INDEX IF NOT EXISTS idx_user_quota_summary_user_id 
ON indb_auth_user_profiles(user_id);

-- Ensure service accounts are properly linked to users in quota usage
-- Add index for better performance on quota calculations
CREATE INDEX IF NOT EXISTS idx_google_quota_usage_date_service_account 
ON indb_google_quota_usage(date, service_account_id);

CREATE INDEX IF NOT EXISTS idx_google_service_accounts_user_id_active 
ON indb_google_service_accounts(user_id, is_active);

-- Update any existing quota usage records to ensure data integrity
-- This is a safety measure to ensure all quota records are properly linked
UPDATE indb_google_quota_usage 
SET updated_at = NOW()
WHERE service_account_id IN (
    SELECT id FROM indb_google_service_accounts WHERE user_id IS NOT NULL
);

-- Ensure RLS policies allow proper access to quota data
ALTER TABLE indb_google_quota_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own quota usage" ON indb_google_quota_usage;
DROP POLICY IF EXISTS "Service role has full access to quota usage" ON indb_google_quota_usage;

-- Create RLS policies for quota usage table
CREATE POLICY "Users can view their own quota usage" ON indb_google_quota_usage
    FOR SELECT
    USING (
        service_account_id IN (
            SELECT id FROM indb_google_service_accounts 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to quota usage" ON indb_google_quota_usage
    FOR ALL
    USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT ON indb_google_quota_usage TO authenticated;
GRANT ALL ON indb_google_quota_usage TO service_role;

-- Refresh the view statistics
ANALYZE indb_google_quota_usage;
ANALYZE indb_google_service_accounts;
ANALYZE indb_auth_user_profiles;