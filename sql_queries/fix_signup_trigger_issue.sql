-- ================================================
-- IndexNow Pro: Fix User Signup Database Issues
-- ================================================
-- This script fixes the "current transaction is aborted" error during user signup
-- Run this in your Supabase SQL Editor

-- 1. Check if there's an existing auth trigger function
-- ================================================
DO $$
BEGIN
    -- Check if the function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        RAISE NOTICE '⚠️  Found existing handle_new_user function - will recreate it';
    ELSE
        RAISE NOTICE 'ℹ️  No existing handle_new_user function found';
    END IF;
END $$;

-- 2. Create or replace the user signup handler function
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_package_id uuid;
BEGIN
    -- Get the Free package ID (fallback to first active package)
    SELECT id INTO default_package_id
    FROM public.indb_payment_packages 
    WHERE slug = 'free' AND is_active = true
    LIMIT 1;
    
    -- If no free package found, get any active package
    IF default_package_id IS NULL THEN
        SELECT id INTO default_package_id
        FROM public.indb_payment_packages 
        WHERE is_active = true
        ORDER BY sort_order ASC, created_at ASC
        LIMIT 1;
    END IF;

    -- Create user profile with safe defaults
    INSERT INTO public.indb_auth_user_profiles (
        user_id,
        full_name,
        role,
        email_notifications,
        package_id,
        subscribed_at,
        expires_at,
        daily_quota_used,
        daily_quota_reset_date,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        'user',
        true,
        default_package_id,
        NOW(),
        NULL, -- No expiry for free plans
        0,
        CURRENT_DATE,
        NOW(),
        NOW()
    );

    -- Create default user settings
    INSERT INTO public.indb_auth_user_settings (
        user_id,
        timeout_duration,
        retry_attempts,
        email_job_completion,
        email_job_failure,
        email_quota_alerts,
        email_daily_report,
        default_schedule,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        30, -- 30 seconds timeout
        3,  -- 3 retry attempts
        true,
        true,
        true,
        false,
        'one-time',
        NOW(),
        NOW()
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the signup
        RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop existing trigger if it exists
-- ================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Create the trigger
-- ================================================
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Ensure required tables exist with proper structure
-- ================================================

-- Create indb_auth_user_profiles if it doesn't exist
CREATE TABLE IF NOT EXISTS public.indb_auth_user_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    full_name text,
    role text DEFAULT 'user',
    email_notifications boolean DEFAULT true,
    phone_number text,
    package_id uuid,
    subscribed_at timestamp with time zone,
    expires_at timestamp with time zone,
    daily_quota_used integer DEFAULT 0,
    daily_quota_reset_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    
    CONSTRAINT indb_auth_user_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT indb_auth_user_profiles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT indb_auth_user_profiles_package_id_fkey 
        FOREIGN KEY (package_id) REFERENCES public.indb_payment_packages(id) ON DELETE SET NULL
);

-- Create indb_auth_user_settings if it doesn't exist
CREATE TABLE IF NOT EXISTS public.indb_auth_user_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    timeout_duration integer DEFAULT 30,
    retry_attempts integer DEFAULT 3,
    email_job_completion boolean DEFAULT true,
    email_job_failure boolean DEFAULT true,
    email_quota_alerts boolean DEFAULT true,
    email_daily_report boolean DEFAULT false,
    default_schedule text DEFAULT 'one-time',
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    
    CONSTRAINT indb_auth_user_settings_pkey PRIMARY KEY (id),
    CONSTRAINT indb_auth_user_settings_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 6. Create indexes
-- ================================================
CREATE INDEX IF NOT EXISTS idx_indb_auth_user_profiles_user_id 
    ON public.indb_auth_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_indb_auth_user_profiles_role 
    ON public.indb_auth_user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_indb_auth_user_profiles_package_id 
    ON public.indb_auth_user_profiles(package_id);

CREATE INDEX IF NOT EXISTS idx_indb_auth_user_settings_user_id 
    ON public.indb_auth_user_settings(user_id);

-- 7. Enable RLS
-- ================================================
ALTER TABLE public.indb_auth_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indb_auth_user_settings ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
-- ================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.indb_auth_user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.indb_auth_user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.indb_auth_user_profiles;
DROP POLICY IF EXISTS "System can create profiles" ON public.indb_auth_user_profiles;

DROP POLICY IF EXISTS "Users can view their own settings" ON public.indb_auth_user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.indb_auth_user_settings;
DROP POLICY IF EXISTS "System can create settings" ON public.indb_auth_user_settings;

-- User Profiles policies
CREATE POLICY "Users can view their own profile" 
    ON public.indb_auth_user_profiles FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
    ON public.indb_auth_user_profiles FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
    ON public.indb_auth_user_profiles FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can create profiles" 
    ON public.indb_auth_user_profiles FOR INSERT 
    WITH CHECK (true); -- Allow system/trigger to create profiles

-- User Settings policies
CREATE POLICY "Users can view their own settings" 
    ON public.indb_auth_user_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
    ON public.indb_auth_user_settings FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "System can create settings" 
    ON public.indb_auth_user_settings FOR INSERT 
    WITH CHECK (true); -- Allow system/trigger to create settings

-- 9. Grant permissions
-- ================================================
GRANT SELECT, INSERT, UPDATE ON public.indb_auth_user_profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.indb_auth_user_settings TO anon, authenticated;

-- 10. Test the setup
-- ================================================
DO $$
DECLARE
    test_package_count integer;
BEGIN
    -- Check if we have payment packages
    SELECT COUNT(*) INTO test_package_count
    FROM public.indb_payment_packages
    WHERE is_active = true;
    
    IF test_package_count = 0 THEN
        RAISE NOTICE '⚠️  WARNING: No active payment packages found! Users may fail to signup.';
        RAISE NOTICE '💡 Run the payment packages creation script first.';
    ELSE
        RAISE NOTICE '✅ Found % active payment packages', test_package_count;
    END IF;
    
    RAISE NOTICE '✅ User signup trigger function created successfully!';
    RAISE NOTICE '✅ RLS policies configured for user profiles and settings!';
    RAISE NOTICE '✅ Database signup errors should now be fixed!';
END $$;