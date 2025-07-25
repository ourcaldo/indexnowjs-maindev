-- Fix RLS policies for admin authentication
-- Run this in Supabase SQL Editor

-- 1. Drop existing RLS policies on indb_auth_user_profiles if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON indb_auth_user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON indb_auth_user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON indb_auth_user_profiles;

-- 2. Create new policies that allow service role full access
CREATE POLICY "Service role has full access" ON indb_auth_user_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Allow authenticated users to read their own profiles
CREATE POLICY "Users can view own profile" ON indb_auth_user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Allow authenticated users to update their own profiles
CREATE POLICY "Users can update own profile" ON indb_auth_user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile" ON indb_auth_user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 6. Ensure RLS is enabled
ALTER TABLE indb_auth_user_profiles ENABLE ROW LEVEL SECURITY;

-- 7. Grant necessary permissions to service role
GRANT ALL ON indb_auth_user_profiles TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- 8. Verify the super_admin user exists (should return 1 row)
SELECT user_id, full_name, role FROM indb_auth_user_profiles 
WHERE user_id = '915f50e5-0902-466a-b1af-bdf19d789722';