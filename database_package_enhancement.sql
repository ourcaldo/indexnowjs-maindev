-- SQL queries to enhance user profiles table with package subscription information
-- Run these queries in your Supabase SQL Editor

-- 1. Add missing package-related columns to indb_auth_user_profiles table
ALTER TABLE indb_auth_user_profiles 
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES indb_payment_packages(id),
ADD COLUMN IF NOT EXISTS subscribed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS daily_quota_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_quota_reset_date DATE DEFAULT CURRENT_DATE;

-- 2. Create or update function to automatically assign free package to new users
CREATE OR REPLACE FUNCTION assign_free_package_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
    free_package_id UUID;
BEGIN
    -- Get the free package ID (assuming slug = 'free')
    SELECT id INTO free_package_id 
    FROM indb_payment_packages 
    WHERE slug = 'free' AND is_active = true 
    LIMIT 1;
    
    -- If free package exists, assign it to the new user
    IF free_package_id IS NOT NULL THEN
        NEW.package_id := free_package_id;
        NEW.subscribed_at := CURRENT_TIMESTAMP;
        -- Free package never expires (set to far future)
        NEW.expires_at := CURRENT_TIMESTAMP + INTERVAL '100 years';
        NEW.daily_quota_used := 0;
        NEW.daily_quota_reset_date := CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to auto-assign free package to new users
DROP TRIGGER IF EXISTS trigger_assign_free_package ON indb_auth_user_profiles;
CREATE TRIGGER trigger_assign_free_package
    BEFORE INSERT ON indb_auth_user_profiles
    FOREACH ROW
    EXECUTE FUNCTION assign_free_package_to_new_user();

-- 4. Update existing users without packages to have free package
DO $$
DECLARE
    free_package_id UUID;
BEGIN
    -- Get the free package ID
    SELECT id INTO free_package_id 
    FROM indb_payment_packages 
    WHERE slug = 'free' AND is_active = true 
    LIMIT 1;
    
    -- Update existing users without packages
    IF free_package_id IS NOT NULL THEN
        UPDATE indb_auth_user_profiles 
        SET 
            package_id = free_package_id,
            subscribed_at = COALESCE(subscribed_at, created_at),
            expires_at = COALESCE(expires_at, CURRENT_TIMESTAMP + INTERVAL '100 years'),
            daily_quota_used = COALESCE(daily_quota_used, 0),
            daily_quota_reset_date = COALESCE(daily_quota_reset_date, CURRENT_DATE)
        WHERE package_id IS NULL;
    END IF;
END;
$$;

-- 5. Create index for better performance on package lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_package_id ON indb_auth_user_profiles(package_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_quota_reset_date ON indb_auth_user_profiles(daily_quota_reset_date);

-- 6. Ensure we have a free package in the system (create if doesn't exist)
INSERT INTO indb_payment_packages (
    id,
    name,
    slug,
    description,
    price,
    currency,
    billing_period,
    features,
    quota_limits,
    is_active,
    sort_order,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Free Plan',
    'free',
    'Basic indexing with limited quotas for personal use',
    0,
    'IDR',
    'monthly',
    '["50 URLs per day", "1 service account", "Basic support"]'::jsonb,
    '{"service_accounts": 1, "daily_urls": 50, "concurrent_jobs": 1}'::jsonb,
    true,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (slug) DO UPDATE SET
    quota_limits = EXCLUDED.quota_limits,
    features = EXCLUDED.features,
    updated_at = CURRENT_TIMESTAMP;

-- 7. Create RLS policies if they don't exist for the package table
DO $$
BEGIN
    -- Policy for users to read their own package information
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'indb_payment_packages' 
        AND policyname = 'Users can view packages'
    ) THEN
        CREATE POLICY "Users can view packages" ON indb_payment_packages
            FOR SELECT USING (true);
    END IF;
END;
$$;

COMMENT ON TABLE indb_auth_user_profiles IS 'Enhanced user profiles with package subscription information';