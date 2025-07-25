-- Fix user_quota_summary view to include package information
-- This will provide all quota data in one query

DROP VIEW IF EXISTS user_quota_summary;

CREATE VIEW user_quota_summary AS
SELECT 
    p.user_id,
    COALESCE(SUM(qu.requests_made), 0) as total_quota_used,
    COUNT(DISTINCT sa.id) as service_account_count,
    COUNT(DISTINCT sa.id) * 200 as total_quota_limit,
    -- Package information
    pkg.name as package_name,
    (pkg.quota_limits->>'daily_urls')::integer as daily_quota_limit,
    (pkg.quota_limits->>'service_accounts')::integer as service_accounts_limit,
    (pkg.quota_limits->>'concurrent_jobs')::integer as concurrent_jobs_limit,
    -- Daily quota usage from profile
    p.daily_quota_used,
    p.daily_quota_reset_date,
    -- Calculate if unlimited
    CASE WHEN (pkg.quota_limits->>'daily_urls')::integer = -1 THEN true ELSE false END as is_unlimited
FROM indb_auth_user_profiles p
LEFT JOIN indb_google_service_accounts sa ON sa.user_id = p.user_id AND sa.is_active = true
LEFT JOIN indb_google_quota_usage qu ON qu.service_account_id = sa.id
LEFT JOIN indb_payment_packages pkg ON pkg.id = p.package_id
GROUP BY 
    p.user_id, 
    p.daily_quota_used, 
    p.daily_quota_reset_date,
    pkg.name,
    pkg.quota_limits;

-- Grant access to the service role
GRANT SELECT ON user_quota_summary TO service_role;