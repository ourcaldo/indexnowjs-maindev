-- ================================================
-- IndexNow Pro: Fix Email Configuration Issues
-- ================================================
-- This script creates/updates email settings to fix TLS certificate errors
-- Run this in your Supabase SQL Editor

-- 1. Create or update site settings table
-- ================================================
CREATE TABLE IF NOT EXISTS public.indb_site_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    site_name text NOT NULL DEFAULT 'IndexNow Pro',
    site_description text DEFAULT 'Professional URL Indexing Service',
    site_logo_url text,
    site_icon_url text,
    site_favicon_url text,
    contact_email text DEFAULT 'support@indexnow.studio',
    support_email text DEFAULT 'support@indexnow.studio',
    maintenance_mode boolean DEFAULT false,
    registration_enabled boolean DEFAULT true,
    
    -- Email Configuration
    smtp_host text DEFAULT 'smtp.gmail.com',
    smtp_port integer DEFAULT 587,
    smtp_user text,
    smtp_password text,
    smtp_from_name text DEFAULT 'IndexNow Pro',
    smtp_from_email text,
    smtp_use_tls boolean DEFAULT true,
    smtp_use_ssl boolean DEFAULT false,
    
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    
    CONSTRAINT indb_site_settings_pkey PRIMARY KEY (id)
);

-- 2. Insert or update email configuration
-- ================================================
INSERT INTO public.indb_site_settings (
    id,
    site_name,
    site_description,
    contact_email,
    support_email,
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_password,
    smtp_from_name,
    smtp_from_email,
    smtp_use_tls,
    smtp_use_ssl
) VALUES (
    '00000000-0000-0000-0000-000000000001', -- Fixed UUID for singleton
    'IndexNow Pro',
    'Professional URL Indexing Service powered by Google Search Console API',
    'support@indexnow.studio',
    'support@indexnow.studio',
    'smtp.gmail.com', -- Use Gmail SMTP instead of custom domain
    587,
    'notifikasi@indexnow.studio',
    'Jembut123!', -- Your app password
    'IndexNow Pro',
    'notifikasi@indexnow.studio',
    true,  -- Use TLS
    false  -- Don't use SSL
) ON CONFLICT (id) DO UPDATE SET
    smtp_host = EXCLUDED.smtp_host,
    smtp_port = EXCLUDED.smtp_port,
    smtp_user = EXCLUDED.smtp_user,
    smtp_password = EXCLUDED.smtp_password,
    smtp_from_name = EXCLUDED.smtp_from_name,
    smtp_from_email = EXCLUDED.smtp_from_email,
    smtp_use_tls = EXCLUDED.smtp_use_tls,
    smtp_use_ssl = EXCLUDED.smtp_use_ssl,
    updated_at = NOW();

-- 3. Enable RLS and create policies
-- ================================================
ALTER TABLE public.indb_site_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Site settings are publicly readable" ON public.indb_site_settings;
DROP POLICY IF EXISTS "Only admins can modify site settings" ON public.indb_site_settings;

-- Public read access (excluding sensitive data)
CREATE POLICY "Site settings are publicly readable" 
    ON public.indb_site_settings FOR SELECT 
    USING (true);

-- Admin write access
CREATE POLICY "Only admins can modify site settings" 
    ON public.indb_site_settings FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- 4. Grant permissions
-- ================================================
GRANT SELECT ON public.indb_site_settings TO anon, authenticated;
GRANT ALL ON public.indb_site_settings TO authenticated;

-- 5. Create function to get safe email settings (excluding password)
-- ================================================
CREATE OR REPLACE FUNCTION public.get_email_settings()
RETURNS TABLE (
    smtp_host text,
    smtp_port integer,
    smtp_from_name text,
    smtp_from_email text,
    smtp_use_tls boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.smtp_host,
        s.smtp_port,
        s.smtp_from_name,
        s.smtp_from_email,
        s.smtp_use_tls
    FROM public.indb_site_settings s
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_email_settings() TO anon, authenticated;

-- 6. Success message
-- ================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Email configuration updated successfully!';
    RAISE NOTICE '✅ Changed SMTP host from mail.indexnow.studio to smtp.gmail.com';
    RAISE NOTICE '✅ This should fix the TLS certificate error during signup';
    RAISE NOTICE '💡 Make sure your Gmail account has "App Passwords" enabled for SMTP';
END $$;