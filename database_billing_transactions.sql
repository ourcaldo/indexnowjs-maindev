-- Create billing transactions table for order tracking
CREATE TABLE IF NOT EXISTS public.indb_billing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.indb_payment_packages(id),
    order_id TEXT NOT NULL UNIQUE,
    transaction_type TEXT NOT NULL DEFAULT 'subscription',
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'IDR',
    billing_period TEXT NOT NULL,
    transaction_status TEXT DEFAULT 'pending' CHECK (transaction_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    payment_method UUID REFERENCES public.indb_payment_gateways(id),
    customer_info JSONB NOT NULL,
    gateway_info JSONB,
    metadata JSONB,
    payment_proof_url TEXT,
    admin_notes TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_transactions_user_id ON public.indb_billing_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_order_id ON public.indb_billing_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_status ON public.indb_billing_transactions(transaction_status);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_created_at ON public.indb_billing_transactions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.indb_billing_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON public.indb_billing_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own transactions  
CREATE POLICY "Users can insert own transactions" ON public.indb_billing_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role has full access (for API operations)
CREATE POLICY "Service role has full access to transactions" ON public.indb_billing_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Admins can manage all transactions
CREATE POLICY "Admins can manage all transactions" ON public.indb_billing_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Grant permissions
GRANT ALL ON public.indb_billing_transactions TO service_role;
GRANT SELECT, INSERT ON public.indb_billing_transactions TO authenticated;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_transactions_updated_at
    BEFORE UPDATE ON public.indb_billing_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for billing history API
CREATE OR REPLACE VIEW public.billing_history_view AS
SELECT 
    t.id,
    t.user_id,
    t.order_id,
    t.transaction_type,
    t.amount,
    t.currency,
    t.billing_period,
    t.transaction_status,
    t.customer_info,
    t.gateway_info,
    t.metadata,
    t.created_at,
    t.updated_at,
    p.name as package_name,
    p.slug as package_slug,
    g.name as gateway_name,
    g.slug as gateway_slug
FROM public.indb_billing_transactions t
LEFT JOIN public.indb_payment_packages p ON t.package_id = p.id
LEFT JOIN public.indb_payment_gateways g ON t.payment_method = g.id
ORDER BY t.created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.billing_history_view TO service_role;
GRANT SELECT ON public.billing_history_view TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Users can view own billing history" ON public.billing_history_view
    FOR SELECT USING (auth.uid() = user_id);

-- Comment on table
COMMENT ON TABLE public.indb_billing_transactions IS 'Stores all billing transactions including subscription purchases, renewals, and refunds';