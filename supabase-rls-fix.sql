-- Fix RLS policies for admin authentication
-- Run this in your Supabase SQL Editor

-- Drop existing RLS policies if they exist (prevents conflicts)
DROP POLICY IF EXISTS "indb_auth_user_profiles_select" ON indb_auth_user_profiles;
DROP POLICY IF EXISTS "indb_auth_user_profiles_insert" ON indb_auth_user_profiles;
DROP POLICY IF EXISTS "indb_auth_user_profiles_update" ON indb_auth_user_profiles;

DROP POLICY IF EXISTS "indb_admin_activity_logs_select" ON indb_admin_activity_logs;
DROP POLICY IF EXISTS "indb_admin_activity_logs_insert" ON indb_admin_activity_logs;

DROP POLICY IF EXISTS "indb_cms_posts_select" ON indb_cms_posts;
DROP POLICY IF EXISTS "indb_cms_posts_insert" ON indb_cms_posts;

DROP POLICY IF EXISTS "indb_site_settings_select" ON indb_site_settings;
DROP POLICY IF EXISTS "indb_site_settings_update" ON indb_site_settings;

DROP POLICY IF EXISTS "indb_payment_gateways_select" ON indb_payment_gateways;
DROP POLICY IF EXISTS "indb_payment_gateways_insert" ON indb_payment_gateways;

DROP POLICY IF EXISTS "indb_payment_packages_select" ON indb_payment_packages;
DROP POLICY IF EXISTS "indb_payment_packages_insert" ON indb_payment_packages;

-- Enable RLS on admin tables
ALTER TABLE indb_auth_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_cms_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_payment_packages ENABLE ROW LEVEL SECURITY;

-- User profiles: Allow service role full access, users can access their own
CREATE POLICY "indb_auth_user_profiles_select" ON indb_auth_user_profiles
FOR SELECT USING (
  -- Service role can access all
  auth.jwt() ->> 'role' = 'service_role'
  OR
  -- Users can access their own profile
  auth.uid() = user_id
);

CREATE POLICY "indb_auth_user_profiles_insert" ON indb_auth_user_profiles
FOR INSERT WITH CHECK (
  -- Service role can insert any
  auth.jwt() ->> 'role' = 'service_role'
  OR
  -- Users can create their own profile
  auth.uid() = user_id
);

CREATE POLICY "indb_auth_user_profiles_update" ON indb_auth_user_profiles
FOR UPDATE USING (
  -- Service role can update any
  auth.jwt() ->> 'role' = 'service_role'
  OR
  -- Users can update their own profile
  auth.uid() = user_id
);

-- Admin activity logs: Only service role and super admins
CREATE POLICY "indb_admin_activity_logs_select" ON indb_admin_activity_logs
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM indb_auth_user_profiles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "indb_admin_activity_logs_insert" ON indb_admin_activity_logs
FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM indb_auth_user_profiles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- CMS posts: Service role and super admins
CREATE POLICY "indb_cms_posts_select" ON indb_cms_posts
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM indb_auth_user_profiles
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

CREATE POLICY "indb_cms_posts_insert" ON indb_cms_posts
FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM indb_auth_user_profiles
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- CMS pages: Service role and super admins
CREATE POLICY "indb_cms_pages_select" ON indb_cms_pages
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM indb_auth_user_profiles
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

CREATE POLICY "indb_cms_pages_insert" ON indb_cms_pages
FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM indb_auth_user_profiles
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Site settings: Service role and super admins only
CREATE POLICY "indb_site_settings_select" ON indb_site_settings
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM indb_auth_user_profiles
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

CREATE POLICY "indb_site_settings_update" ON indb_site_settings
FOR UPDATE USING (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM indb_auth_user_profiles
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Payment gateways: Service role and super admins only
CREATE POLICY "indb_payment_gateways_select" ON indb_payment_gateways
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM indb_auth_user_profiles
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

CREATE POLICY "indb_payment_gateways_insert" ON indb_payment_gateways
FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM indb_auth_user_profiles
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Payment packages: Service role and super admins only
CREATE POLICY "indb_payment_packages_select" ON indb_payment_packages
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM indb_auth_user_profiles
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

CREATE POLICY "indb_payment_packages_insert" ON indb_payment_packages
FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM indb_auth_user_profiles
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Ensure admin dashboard stats view is accessible
CREATE OR REPLACE VIEW admin_dashboard_stats AS 
SELECT 
  (SELECT COUNT(*) FROM indb_auth_user_profiles) as total_users,
  (SELECT COUNT(*) FROM indb_auth_user_profiles WHERE role = 'user') as regular_users,
  (SELECT COUNT(*) FROM indb_auth_user_profiles WHERE role = 'admin') as admin_users,
  (SELECT COUNT(*) FROM indb_auth_user_profiles WHERE role = 'super_admin') as super_admin_users,
  (SELECT COUNT(*) FROM indb_indexing_jobs) as total_jobs,
  (SELECT COUNT(*) FROM indb_indexing_jobs WHERE status IN ('pending', 'running')) as active_jobs,
  (SELECT COUNT(*) FROM indb_indexing_jobs WHERE status = 'completed') as completed_jobs,
  (SELECT COUNT(*) FROM indb_indexing_jobs WHERE status = 'failed') as failed_jobs,
  (SELECT COUNT(*) FROM indb_google_service_accounts) as total_service_accounts,
  (SELECT COUNT(*) FROM indb_google_service_accounts WHERE is_active = true) as active_service_accounts,
  (SELECT COALESCE(SUM(requests_made), 0) FROM indb_google_quota_usage WHERE date = CURRENT_DATE) as daily_api_requests,
  (SELECT COUNT(*) FROM indb_cms_posts WHERE status = 'published') as published_posts,
  (SELECT COUNT(*) FROM indb_cms_pages WHERE status = 'published') as published_pages;

-- Grant access to the view
GRANT SELECT ON admin_dashboard_stats TO service_role;
GRANT SELECT ON admin_dashboard_stats TO authenticated;

-- Create a test super admin user (replace with your actual user ID)
-- INSERT INTO indb_auth_user_profiles (user_id, full_name, role, email_notifications, created_at, updated_at)
-- VALUES ('[YOUR_USER_ID]', 'Super Admin', 'super_admin', true, NOW(), NOW())
-- ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';

-- Verify RLS policies are working
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename LIKE 'indb_%'
ORDER BY tablename, policyname;