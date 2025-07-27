-- ================================================
-- IndexNow Pro: Complete Payment System Tables
-- ================================================
-- Run this script in your Supabase SQL Editor to create all missing payment-related tables
-- This will fix the "relation 'indb_payment_packages' does not exist" error during user signup

-- 1. Payment Gateways Table
-- ================================================
CREATE TABLE IF NOT EXISTS public.indb_payment_gateways (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    configuration jsonb,
    api_credentials jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT indb_payment_gateways_pkey PRIMARY KEY (id)
);

-- 2. Payment Packages Table (CRITICAL - Missing table causing signup errors)
-- ================================================
CREATE TABLE IF NOT EXISTS public.indb_payment_packages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    price numeric NOT NULL,
    currency text DEFAULT 'IDR',
    billing_period text DEFAULT 'monthly',
    features jsonb,
    quota_limits jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    is_popular boolean DEFAULT false,
    pricing_tiers jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT indb_payment_packages_pkey PRIMARY KEY (id)
);

-- 3. Payment Subscriptions Table
-- ================================================
CREATE TABLE IF NOT EXISTS public.indb_payment_subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    package_id uuid NOT NULL,
    gateway_id uuid NOT NULL,
    subscription_status text NOT NULL,
    billing_period text NOT NULL,
    amount_paid numeric NOT NULL,
    currency text NOT NULL,
    started_at timestamp with time zone,
    expires_at timestamp with time zone,
    auto_renew boolean DEFAULT true,
    payment_reference text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT indb_payment_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT indb_payment_subscriptions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT indb_payment_subscriptions_package_id_fkey 
        FOREIGN KEY (package_id) REFERENCES public.indb_payment_packages(id) ON DELETE RESTRICT,
    CONSTRAINT indb_payment_subscriptions_gateway_id_fkey 
        FOREIGN KEY (gateway_id) REFERENCES public.indb_payment_gateways(id) ON DELETE RESTRICT
);

-- 4. Payment Transactions Table
-- ================================================
CREATE TABLE IF NOT EXISTS public.indb_payment_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    subscription_id uuid,
    package_id uuid NOT NULL,
    gateway_id uuid NOT NULL,
    transaction_type text NOT NULL,
    transaction_status text NOT NULL,
    amount numeric NOT NULL,
    currency text NOT NULL,
    payment_method text,
    payment_reference text,
    payment_proof_url text,
    gateway_transaction_id text,
    gateway_response jsonb,
    processed_at timestamp with time zone,
    verified_by uuid,
    verified_at timestamp with time zone,
    notes text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT indb_payment_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT indb_payment_transactions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT indb_payment_transactions_subscription_id_fkey 
        FOREIGN KEY (subscription_id) REFERENCES public.indb_payment_subscriptions(id) ON DELETE SET NULL,
    CONSTRAINT indb_payment_transactions_package_id_fkey 
        FOREIGN KEY (package_id) REFERENCES public.indb_payment_packages(id) ON DELETE RESTRICT,
    CONSTRAINT indb_payment_transactions_gateway_id_fkey 
        FOREIGN KEY (gateway_id) REFERENCES public.indb_payment_gateways(id) ON DELETE RESTRICT,
    CONSTRAINT indb_payment_transactions_verified_by_fkey 
        FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 5. Payment Invoices Table
-- ================================================
CREATE TABLE IF NOT EXISTS public.indb_payment_invoices (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    subscription_id uuid,
    transaction_id uuid,
    invoice_number text NOT NULL UNIQUE,
    invoice_status text NOT NULL,
    subtotal numeric NOT NULL,
    tax_amount numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    total_amount numeric NOT NULL,
    currency text NOT NULL,
    due_date date,
    paid_at timestamp with time zone,
    invoice_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT indb_payment_invoices_pkey PRIMARY KEY (id),
    CONSTRAINT indb_payment_invoices_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT indb_payment_invoices_subscription_id_fkey 
        FOREIGN KEY (subscription_id) REFERENCES public.indb_payment_subscriptions(id) ON DELETE SET NULL,
    CONSTRAINT indb_payment_invoices_transaction_id_fkey 
        FOREIGN KEY (transaction_id) REFERENCES public.indb_payment_transactions(id) ON DELETE SET NULL
);

-- ================================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- ================================================

-- Payment Gateways indexes
CREATE INDEX IF NOT EXISTS idx_indb_payment_gateways_slug ON public.indb_payment_gateways(slug);
CREATE INDEX IF NOT EXISTS idx_indb_payment_gateways_is_active ON public.indb_payment_gateways(is_active);

-- Payment Packages indexes
CREATE INDEX IF NOT EXISTS idx_indb_payment_packages_slug ON public.indb_payment_packages(slug);
CREATE INDEX IF NOT EXISTS idx_indb_payment_packages_is_active ON public.indb_payment_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_indb_payment_packages_sort_order ON public.indb_payment_packages(sort_order);

-- Payment Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_indb_payment_subscriptions_user_id ON public.indb_payment_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_indb_payment_subscriptions_package_id ON public.indb_payment_subscriptions(package_id);
CREATE INDEX IF NOT EXISTS idx_indb_payment_subscriptions_status ON public.indb_payment_subscriptions(subscription_status);

-- Payment Transactions indexes
CREATE INDEX IF NOT EXISTS idx_indb_payment_transactions_user_id ON public.indb_payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_indb_payment_transactions_package_id ON public.indb_payment_transactions(package_id);
CREATE INDEX IF NOT EXISTS idx_indb_payment_transactions_status ON public.indb_payment_transactions(transaction_status);
CREATE INDEX IF NOT EXISTS idx_indb_payment_transactions_created_at ON public.indb_payment_transactions(created_at DESC);

-- Payment Invoices indexes
CREATE INDEX IF NOT EXISTS idx_indb_payment_invoices_user_id ON public.indb_payment_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_indb_payment_invoices_invoice_number ON public.indb_payment_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_indb_payment_invoices_status ON public.indb_payment_invoices(invoice_status);

-- ================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ================================================

ALTER TABLE public.indb_payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indb_payment_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indb_payment_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indb_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indb_payment_invoices ENABLE ROW LEVEL SECURITY;

-- ================================================
-- CREATE RLS POLICIES
-- ================================================

-- Payment Gateways - Public read access, admin write access
CREATE POLICY "Payment gateways are publicly readable" 
    ON public.indb_payment_gateways FOR SELECT 
    USING (true);

CREATE POLICY "Only admins can modify payment gateways" 
    ON public.indb_payment_gateways FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Payment Packages - Public read access, admin write access
CREATE POLICY "Payment packages are publicly readable" 
    ON public.indb_payment_packages FOR SELECT 
    USING (true);

CREATE POLICY "Only admins can modify payment packages" 
    ON public.indb_payment_packages FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Payment Subscriptions - Users can access their own, admins can access all
CREATE POLICY "Users can view their own subscriptions" 
    ON public.indb_payment_subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" 
    ON public.indb_payment_subscriptions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can create their own subscriptions" 
    ON public.indb_payment_subscriptions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can modify all subscriptions" 
    ON public.indb_payment_subscriptions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Payment Transactions - Users can access their own, admins can access all
CREATE POLICY "Users can view their own transactions" 
    ON public.indb_payment_transactions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" 
    ON public.indb_payment_transactions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can create their own transactions" 
    ON public.indb_payment_transactions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
    ON public.indb_payment_transactions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can modify all transactions" 
    ON public.indb_payment_transactions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Payment Invoices - Users can access their own, admins can access all
CREATE POLICY "Users can view their own invoices" 
    ON public.indb_payment_invoices FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoices" 
    ON public.indb_payment_invoices FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can create their own invoices" 
    ON public.indb_payment_invoices FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can modify all invoices" 
    ON public.indb_payment_invoices FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- ================================================
-- INSERT DEFAULT DATA
-- ================================================

-- Insert default payment gateway (Manual Bank Transfer)
INSERT INTO public.indb_payment_gateways (id, name, slug, description, is_active, is_default, configuration)
VALUES (
    gen_random_uuid(),
    'Manual Bank Transfer',
    'manual-bank-transfer',
    'Manual bank transfer payment method with proof upload',
    true,
    true,
    '{"requires_proof": true, "manual_verification": true}'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Insert default payment packages
INSERT INTO public.indb_payment_packages (id, name, slug, description, price, currency, billing_period, features, quota_limits, is_active, sort_order, is_popular, pricing_tiers)
VALUES 
(
    gen_random_uuid(),
    'Free',
    'free',
    'Perfect for testing and small websites',
    0,
    'IDR',
    'monthly',
    '["50 Daily Quota for IndexNow", "Max. 1 Service Account", "Basic Support"]'::jsonb,
    '{"daily_quota_limit": 50, "service_accounts_limit": 1, "concurrent_jobs_limit": 1}'::jsonb,
    true,
    1,
    false,
    '{"monthly": {"period": "monthly", "regular_price": 0}}'::jsonb
),
(
    gen_random_uuid(),
    'Premium',
    'premium',
    'Best for small to medium businesses',
    50000,
    'IDR',
    'monthly',
    '["500 Daily Quota for IndexNow", "Max 3 Service Account", "Auto Schedule Feature", "Priority Support"]'::jsonb,
    '{"daily_quota_limit": 500, "service_accounts_limit": 3, "concurrent_jobs_limit": 5}'::jsonb,
    true,
    2,
    true,
    '{"monthly": {"period": "monthly", "regular_price": 50000}, "yearly": {"period": "yearly", "regular_price": 500000, "promo_price": 400000, "discount_percentage": 20}}'::jsonb
),
(
    gen_random_uuid(),
    'Pro',
    'pro',
    'Perfect for agencies and large websites',
    140000,
    'IDR',
    'monthly',
    '["Unlimited Daily Quota", "Unlimited Service Account", "Auto Schedule Feature", "Advanced Analytics", "Premium Support", "White Label Option"]'::jsonb,
    '{"daily_quota_limit": -1, "service_accounts_limit": -1, "concurrent_jobs_limit": -1}'::jsonb,
    true,
    3,
    false,
    '{"monthly": {"period": "monthly", "regular_price": 140000}, "yearly": {"period": "yearly", "regular_price": 1400000, "promo_price": 1120000, "discount_percentage": 20}}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ================================================
-- GRANT PERMISSIONS
-- ================================================

GRANT SELECT, INSERT, UPDATE ON public.indb_payment_gateways TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.indb_payment_packages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indb_payment_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indb_payment_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indb_payment_invoices TO authenticated;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Payment system tables created successfully!';
    RAISE NOTICE '✅ Default payment gateway and packages inserted!';
    RAISE NOTICE '✅ RLS policies and permissions configured!';
    RAISE NOTICE '✅ The "indb_payment_packages does not exist" error should now be fixed!';
END $$;