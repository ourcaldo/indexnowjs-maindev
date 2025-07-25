-- Activity Logs Migration: Rename table and create comprehensive activity tracking
-- Run this in Supabase SQL Editor

-- 1. Create new comprehensive activity logs table following collections naming convention
-- Using "security" collection for activity tracking: indb_security_activity_logs

CREATE TABLE IF NOT EXISTS public.indb_security_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- login, logout, create_job, update_profile, api_call, etc.
    action_description TEXT NOT NULL,
    target_type TEXT, -- jobs, service_accounts, users, settings, etc.
    target_id UUID, -- ID of the target resource
    ip_address INET,
    user_agent TEXT,
    device_info JSONB, -- Browser, OS, device type information
    location_data JSONB, -- City, country if available
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB, -- Additional context data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_activity_logs_user_id ON public.indb_security_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_activity_logs_created_at ON public.indb_security_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_activity_logs_event_type ON public.indb_security_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_activity_logs_target_type ON public.indb_security_activity_logs(target_type);

-- 3. Migrate existing data from old table to new table if exists
INSERT INTO public.indb_security_activity_logs (
    id, user_id, event_type, action_description, target_type, target_id, 
    ip_address, user_agent, metadata, created_at
)
SELECT 
    id,
    admin_id as user_id,
    action_type as event_type,
    action_description,
    target_type,
    target_id,
    ip_address,
    user_agent,
    metadata,
    created_at
FROM public.indb_admin_activity_logs
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'indb_admin_activity_logs');

-- 4. Create RLS policies for the new table
ALTER TABLE public.indb_security_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own activity logs
CREATE POLICY "Users can view own activity logs" ON public.indb_security_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all activity logs
CREATE POLICY "Service role full access" ON public.indb_security_activity_logs
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Drop old table after migration (uncomment if you want to remove old table)
DROP TABLE IF EXISTS public.indb_admin_activity_logs;

-- 6. Grant necessary permissions
GRANT ALL ON public.indb_security_activity_logs TO service_role;
GRANT SELECT ON public.indb_security_activity_logs TO authenticated;

-- 7. Create a function to log activity automatically
CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_user_id UUID,
    p_event_type TEXT,
    p_action_description TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT NULL,
    p_location_data JSONB DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO public.indb_security_activity_logs (
        user_id, event_type, action_description, target_type, target_id,
        ip_address, user_agent, device_info, location_data, success,
        error_message, metadata
    ) VALUES (
        p_user_id, p_event_type, p_action_description, p_target_type, p_target_id,
        p_ip_address, p_user_agent, p_device_info, p_location_data, p_success,
        p_error_message, p_metadata
    ) RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.log_user_activity TO service_role;
GRANT EXECUTE ON FUNCTION public.log_user_activity TO authenticated;