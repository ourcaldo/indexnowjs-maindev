-- Admin Dashboard Database Schema
-- Run this SQL in Supabase SQL Editor to create admin tables

-- 1. SITE MANAGEMENT COLLECTION
-- Site settings table
CREATE TABLE IF NOT EXISTS indb_site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_name TEXT NOT NULL DEFAULT 'IndexNow Pro',
    site_description TEXT DEFAULT 'Professional URL indexing automation platform',
    site_logo_url TEXT,
    site_icon_url TEXT,
    site_favicon_url TEXT,
    contact_email TEXT,
    support_email TEXT,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    registration_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PAYMENT COLLECTION
-- Payment gateways table
CREATE TABLE IF NOT EXISTS indb_payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    configuration JSONB DEFAULT '{}',
    api_credentials JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment packages table
CREATE TABLE IF NOT EXISTS indb_payment_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    billing_period TEXT DEFAULT 'monthly', -- monthly, yearly, lifetime
    features JSONB DEFAULT '[]',
    quota_limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CMS COLLECTION
-- CMS posts table
CREATE TABLE IF NOT EXISTS indb_cms_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT,
    excerpt TEXT,
    featured_image_url TEXT,
    author_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'draft', -- draft, published, archived
    post_type TEXT DEFAULT 'post', -- post, news, blog
    meta_title TEXT,
    meta_description TEXT,
    tags JSONB DEFAULT '[]',
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CMS pages table
CREATE TABLE IF NOT EXISTS indb_cms_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT,
    template TEXT DEFAULT 'default',
    featured_image_url TEXT,
    author_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'draft', -- draft, published, archived
    is_homepage BOOLEAN DEFAULT FALSE,
    meta_title TEXT,
    meta_description TEXT,
    custom_css TEXT,
    custom_js TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ADMIN COLLECTION
-- Admin activity logs table (enhanced from security logs)
CREATE TABLE IF NOT EXISTS indb_admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL, -- user_management, content_management, system_settings, etc.
    action_description TEXT NOT NULL,
    target_type TEXT, -- user, post, page, setting, etc.
    target_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin dashboard stats view
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM indb_auth_user_profiles) as total_users,
    (SELECT COUNT(*) FROM indb_auth_user_profiles WHERE role = 'user') as regular_users,
    (SELECT COUNT(*) FROM indb_auth_user_profiles WHERE role = 'admin') as admin_users,
    (SELECT COUNT(*) FROM indb_auth_user_profiles WHERE role = 'super_admin') as super_admin_users,
    (SELECT COUNT(*) FROM indb_indexing_jobs) as total_jobs,
    (SELECT COUNT(*) FROM indb_indexing_jobs WHERE status = 'running') as active_jobs,
    (SELECT COUNT(*) FROM indb_indexing_jobs WHERE status = 'completed') as completed_jobs,
    (SELECT COUNT(*) FROM indb_indexing_jobs WHERE status = 'failed') as failed_jobs,
    (SELECT COUNT(*) FROM indb_google_service_accounts) as total_service_accounts,
    (SELECT COUNT(*) FROM indb_google_service_accounts WHERE is_active = TRUE) as active_service_accounts,
    (SELECT SUM(requests_made) FROM indb_google_quota_usage WHERE date = CURRENT_DATE) as daily_api_requests,
    (SELECT COUNT(*) FROM indb_cms_posts WHERE status = 'published') as published_posts,
    (SELECT COUNT(*) FROM indb_cms_pages WHERE status = 'published') as published_pages;

-- Insert default data
-- Default site settings
INSERT INTO indb_site_settings (site_name, site_description) 
VALUES ('IndexNow Pro', 'Professional URL indexing automation platform')
ON CONFLICT DO NOTHING;

-- Default payment gateways
INSERT INTO indb_payment_gateways (name, slug, description, is_default) VALUES
('Bank Transfer', 'bank_transfer', 'Manual bank transfer payment method', TRUE),
('PayPal', 'paypal', 'PayPal payment gateway', FALSE),
('Stripe', 'stripe', 'Stripe payment processing', FALSE)
ON CONFLICT (slug) DO NOTHING;

-- Default packages
INSERT INTO indb_payment_packages (name, slug, description, price, features, quota_limits) VALUES
('Free', 'free', 'Basic indexing features for personal use', 0, 
 '["Basic URL indexing", "1 service account", "50 URLs per day"]', 
 '{"daily_urls": 50, "service_accounts": 1, "concurrent_jobs": 1}'),
('Premium', 'premium', 'Enhanced features for professionals', 29.99, 
 '["Advanced indexing", "5 service accounts", "500 URLs per day", "Priority support"]', 
 '{"daily_urls": 500, "service_accounts": 5, "concurrent_jobs": 3}'),
('Pro', 'pro', 'Full features for agencies and enterprises', 99.99, 
 '["Unlimited indexing", "Unlimited service accounts", "Unlimited URLs", "24/7 support", "Custom integrations"]', 
 '{"daily_urls": -1, "service_accounts": -1, "concurrent_jobs": 10}')
ON CONFLICT (slug) DO NOTHING;

-- Row Level Security (RLS) Policies
-- Only super_admin can access admin tables
ALTER TABLE indb_site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_payment_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_cms_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Site settings policies
CREATE POLICY "Super admin can manage site settings" ON indb_site_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM indb_auth_user_profiles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Payment gateways policies  
CREATE POLICY "Super admin can manage payment gateways" ON indb_payment_gateways
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM indb_auth_user_profiles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Payment packages policies
CREATE POLICY "Super admin can manage packages" ON indb_payment_packages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM indb_auth_user_profiles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- CMS posts policies
CREATE POLICY "Super admin can manage posts" ON indb_cms_posts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM indb_auth_user_profiles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- CMS pages policies
CREATE POLICY "Super admin can manage pages" ON indb_cms_pages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM indb_auth_user_profiles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Admin activity logs policies
CREATE POLICY "Super admin can view activity logs" ON indb_admin_activity_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM indb_auth_user_profiles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cms_posts_status ON indb_cms_posts(status);
CREATE INDEX IF NOT EXISTS idx_cms_posts_author ON indb_cms_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_cms_posts_published ON indb_cms_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON indb_cms_pages(status);
CREATE INDEX IF NOT EXISTS idx_cms_pages_author ON indb_cms_pages(author_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON indb_admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_type ON indb_admin_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON indb_admin_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_packages_active ON indb_payment_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_active ON indb_payment_gateways(is_active);