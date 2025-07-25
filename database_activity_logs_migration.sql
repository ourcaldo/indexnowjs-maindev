-- Enhanced Activity Logs Migration Script for IndexNow Pro
-- Execute this in Supabase SQL Editor to update the activity logging system
-- Following the indb_{collection}_{table-name} naming convention

-- First, check if the old table exists and rename it to follow security collection naming
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'indb_admin_activity_logs') THEN
        -- Rename the old table to follow proper collections naming
        ALTER TABLE indb_admin_activity_logs RENAME TO indb_security_activity_logs;
        RAISE NOTICE 'Renamed indb_admin_activity_logs to indb_security_activity_logs';
    END IF;
END $$;

-- Create the security activity logs table if it doesn't exist
-- This table tracks ALL user activities (not just admin actions)
CREATE TABLE IF NOT EXISTS indb_security_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login', 'logout', 'register', 'password_reset', 'profile_update',
        'job_create', 'job_update', 'job_delete', 'job_start', 'job_pause', 'job_resume',
        'service_account_add', 'service_account_update', 'service_account_delete',
        'admin_login', 'user_management', 'user_suspend', 'user_password_reset',
        'api_call', 'settings_change', 'quota_alert', 'system_error'
    )),
    action_description TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    location_data JSONB DEFAULT '{}',
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_security_activity_logs_user_id ON indb_security_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_activity_logs_created_at ON indb_security_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_activity_logs_event_type ON indb_security_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_activity_logs_success ON indb_security_activity_logs(success);
CREATE INDEX IF NOT EXISTS idx_security_activity_logs_user_created ON indb_security_activity_logs(user_id, created_at DESC);

-- Enhanced RLS (Row Level Security) policies for the security activity logs
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own activity logs" ON indb_security_activity_logs;
DROP POLICY IF EXISTS "Service role has full access to security activity logs" ON indb_security_activity_logs;
DROP POLICY IF EXISTS "Super admins can view all activity logs" ON indb_security_activity_logs;

-- Enable RLS
ALTER TABLE indb_security_activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for system operations and admin functions)
CREATE POLICY "Service role has full access to security activity logs"
    ON indb_security_activity_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow users to view only their own activity logs
CREATE POLICY "Users can view their own activity logs"
    ON indb_security_activity_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow super admins to view all activity logs (for admin dashboard)
CREATE POLICY "Super admins can view all activity logs"
    ON indb_security_activity_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Grant necessary permissions to service role
GRANT ALL ON indb_security_activity_logs TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Create a function to automatically log activity (for use in triggers if needed)
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_event_type TEXT,
    p_action_description TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO indb_security_activity_logs (
        user_id,
        event_type,
        action_description,
        target_type,
        target_id,
        ip_address,
        user_agent,
        success,
        error_message,
        metadata
    ) VALUES (
        p_user_id,
        p_event_type,
        p_action_description,
        p_target_type,
        p_target_id,
        p_ip_address,
        p_user_agent,
        p_success,
        p_error_message,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Grant execute permission on the function to service role
GRANT EXECUTE ON FUNCTION log_user_activity TO service_role;

-- Create a view for admin dashboard analytics
CREATE OR REPLACE VIEW admin_activity_stats AS
SELECT 
    DATE(created_at) as activity_date,
    event_type,
    COUNT(*) as event_count,
    COUNT(CASE WHEN success = true THEN 1 END) as success_count,
    COUNT(CASE WHEN success = false THEN 1 END) as failure_count,
    COUNT(DISTINCT user_id) as unique_users
FROM indb_security_activity_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), event_type
ORDER BY activity_date DESC, event_count DESC;

-- Grant access to the view
GRANT SELECT ON admin_activity_stats TO service_role;

-- Create a function to clean up old activity logs (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM indb_security_activity_logs 
    WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_old_activity_logs TO service_role;

-- Insert some sample activity logs for testing (optional)
-- Remove this section if you don't want sample data
INSERT INTO indb_security_activity_logs (
    user_id,
    event_type,
    action_description,
    success,
    metadata
) 
SELECT 
    user_id,
    'login' as event_type,
    'User logged into the application' as action_description,
    true as success,
    '{"source": "migration_sample"}' as metadata
FROM indb_auth_user_profiles 
WHERE role IN ('super_admin', 'admin')
LIMIT 5
ON CONFLICT DO NOTHING;

-- Show table structure and row count for verification
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    typname as data_type,
    attnotnull as not_null
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_type t ON a.atttypid = t.oid
WHERE c.relname = 'indb_security_activity_logs'
AND n.nspname = 'public'
AND a.attnum > 0
AND NOT a.attisdropped
ORDER BY a.attnum;

-- Show current row count
SELECT COUNT(*) as total_activity_logs FROM indb_security_activity_logs;

-- Show recent activity by event type
SELECT 
    event_type,
    COUNT(*) as count,
    COUNT(CASE WHEN success = true THEN 1 END) as successful,
    COUNT(CASE WHEN success = false THEN 1 END) as failed
FROM indb_security_activity_logs 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY event_type
ORDER BY count DESC;

RAISE NOTICE 'Enhanced activity logs migration completed successfully!';
RAISE NOTICE 'Table: indb_security_activity_logs is ready for comprehensive user activity tracking';
RAISE NOTICE 'All RLS policies and indexes have been created';
RAISE NOTICE 'Helper functions are available for activity logging and cleanup';