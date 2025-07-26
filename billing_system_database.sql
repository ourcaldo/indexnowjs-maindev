-- Billing System Database Schema
-- Run this SQL in Supabase SQL Editor

-- Table for tracking user subscriptions history
CREATE TABLE IF NOT EXISTS indb_payment_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES indb_payment_packages(id),
    gateway_id UUID NOT NULL REFERENCES indb_payment_gateways(id),
    subscription_status TEXT NOT NULL DEFAULT 'pending', -- pending, active, expired, cancelled, suspended
    billing_period TEXT NOT NULL, -- monthly, 3-month, 6-month, 12-month
    amount_paid NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    started_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT false,
    payment_reference TEXT, -- bank transfer reference or other payment details
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking billing transactions
CREATE TABLE IF NOT EXISTS indb_payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES indb_payment_subscriptions(id),
    package_id UUID NOT NULL REFERENCES indb_payment_packages(id),
    gateway_id UUID NOT NULL REFERENCES indb_payment_gateways(id),
    transaction_type TEXT NOT NULL, -- subscription, upgrade, downgrade, renewal
    transaction_status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled, refunded
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    payment_method TEXT, -- bank_transfer, credit_card, etc
    payment_reference TEXT,
    payment_proof_url TEXT, -- URL to uploaded payment proof
    gateway_transaction_id TEXT,
    gateway_response JSONB DEFAULT '{}',
    processed_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id), -- admin who verified the payment
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing billing invoices
CREATE TABLE IF NOT EXISTS indb_payment_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES indb_payment_subscriptions(id),
    transaction_id UUID REFERENCES indb_payment_transactions(id),
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    subtotal NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    invoice_data JSONB NOT NULL, -- Full invoice details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_subscriptions_user_id ON indb_payment_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_subscriptions_status ON indb_payment_subscriptions(subscription_status);
CREATE INDEX IF NOT EXISTS idx_payment_subscriptions_expires_at ON indb_payment_subscriptions(expires_at);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON indb_payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription_id ON indb_payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON indb_payment_transactions(transaction_status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON indb_payment_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_invoices_user_id ON indb_payment_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_status ON indb_payment_invoices(invoice_status);
CREATE INDEX IF NOT EXISTS idx_payment_invoices_number ON indb_payment_invoices(invoice_number);

-- Row Level Security (RLS) Policies
ALTER TABLE indb_payment_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE indb_payment_invoices ENABLE ROW LEVEL SECURITY;

-- User can only see their own subscription data
CREATE POLICY "Users can view own subscriptions" ON indb_payment_subscriptions
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert own subscriptions" ON indb_payment_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own subscriptions" ON indb_payment_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to subscriptions" ON indb_payment_subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User can only see their own transaction data
CREATE POLICY "Users can view own transactions" ON indb_payment_transactions
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert own transactions" ON indb_payment_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to transactions" ON indb_payment_transactions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User can only see their own invoice data
CREATE POLICY "Users can view own invoices" ON indb_payment_invoices
    FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to invoices" ON indb_payment_invoices
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_subscriptions_updated_at BEFORE UPDATE ON indb_payment_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON indb_payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_invoices_updated_at BEFORE UPDATE ON indb_payment_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for user billing summary
CREATE OR REPLACE VIEW user_billing_summary AS
SELECT 
    up.user_id,
    up.full_name,
    up.package_id,
    pp.name as package_name,
    pp.slug as package_slug,
    up.subscribed_at,
    up.expires_at,
    CASE 
        WHEN up.expires_at IS NULL THEN 'no_subscription'
        WHEN up.expires_at < NOW() THEN 'expired'
        WHEN up.expires_at < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'active'
    END as subscription_status,
    (
        SELECT ps.subscription_status 
        FROM indb_payment_subscriptions ps 
        WHERE ps.user_id = up.user_id 
        AND ps.package_id = up.package_id 
        ORDER BY ps.created_at DESC 
        LIMIT 1
    ) as current_subscription_status,
    (
        SELECT COUNT(*)
        FROM indb_payment_transactions pt
        WHERE pt.user_id = up.user_id
        AND pt.transaction_status = 'completed'
    ) as total_payments,
    (
        SELECT COALESCE(SUM(pt.amount), 0)
        FROM indb_payment_transactions pt
        WHERE pt.user_id = up.user_id
        AND pt.transaction_status = 'completed'
    ) as total_spent
FROM indb_auth_user_profiles up
LEFT JOIN indb_payment_packages pp ON up.package_id = pp.id;

-- Grant permissions
GRANT SELECT ON user_billing_summary TO authenticated;
GRANT SELECT ON user_billing_summary TO service_role;