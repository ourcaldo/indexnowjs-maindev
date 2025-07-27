-- Create table for payment transaction history
CREATE TABLE IF NOT EXISTS public.indb_payment_transactions_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL,
    old_status text,
    new_status text NOT NULL,
    action_type text NOT NULL, -- 'status_change', 'proof_upload', 'notes_update', 'admin_action'
    action_description text NOT NULL,
    changed_by uuid,
    changed_by_type text NOT NULL DEFAULT 'user', -- 'user', 'admin', 'system'
    old_values jsonb,
    new_values jsonb,
    notes text,
    metadata jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    
    CONSTRAINT indb_payment_transactions_history_pkey PRIMARY KEY (id),
    CONSTRAINT indb_payment_transactions_history_transaction_id_fkey 
        FOREIGN KEY (transaction_id) REFERENCES public.indb_payment_transactions(id) ON DELETE CASCADE,
    CONSTRAINT indb_payment_transactions_history_changed_by_fkey 
        FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_indb_payment_transactions_history_transaction_id 
    ON public.indb_payment_transactions_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_indb_payment_transactions_history_created_at 
    ON public.indb_payment_transactions_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_indb_payment_transactions_history_action_type 
    ON public.indb_payment_transactions_history(action_type);

-- Enable RLS
ALTER TABLE public.indb_payment_transactions_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admin users can see all transaction history
CREATE POLICY "Admin users can view all transaction history" 
    ON public.indb_payment_transactions_history FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Users can only see their own transaction history
CREATE POLICY "Users can view their own transaction history" 
    ON public.indb_payment_transactions_history FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.indb_payment_transactions pt
            WHERE pt.id = transaction_id 
            AND pt.user_id = auth.uid()
        )
    );

-- Only admins can insert transaction history (manual entries)
CREATE POLICY "Admin users can insert transaction history" 
    ON public.indb_payment_transactions_history FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.indb_auth_user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Create function to automatically log transaction changes
CREATE OR REPLACE FUNCTION log_transaction_history()
RETURNS TRIGGER AS $$
DECLARE
    change_description text;
    action_type_val text;
    old_vals jsonb := '{}';
    new_vals jsonb := '{}';
BEGIN
    -- Determine action type and description based on what changed
    IF TG_OP = 'INSERT' THEN
        action_type_val := 'order_created';
        change_description := 'Order created';
        new_vals := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Status change
        IF OLD.transaction_status != NEW.transaction_status THEN
            action_type_val := 'status_change';
            CASE NEW.transaction_status
                WHEN 'completed' THEN change_description := 'Payment approved and subscription activated';
                WHEN 'failed' THEN change_description := 'Payment rejected';
                WHEN 'proof_uploaded' THEN change_description := 'Payment proof uploaded';
                ELSE change_description := 'Status changed to ' || NEW.transaction_status;
            END CASE;
        -- Payment proof upload
        ELSIF OLD.payment_proof_url IS NULL AND NEW.payment_proof_url IS NOT NULL THEN
            action_type_val := 'proof_upload';
            change_description := 'Payment proof uploaded';
        -- Notes update
        ELSIF OLD.notes != NEW.notes OR (OLD.notes IS NULL AND NEW.notes IS NOT NULL) THEN
            action_type_val := 'notes_update';
            change_description := 'Admin notes updated';
        -- Verification
        ELSIF OLD.verified_by IS NULL AND NEW.verified_by IS NOT NULL THEN
            action_type_val := 'admin_action';
            change_description := 'Order verified by admin';
        ELSE
            action_type_val := 'order_updated';
            change_description := 'Order information updated';
        END IF;
        
        old_vals := to_jsonb(OLD);
        new_vals := to_jsonb(NEW);
    END IF;

    -- Insert history record
    INSERT INTO public.indb_payment_transactions_history (
        transaction_id,
        old_status,
        new_status,
        action_type,
        action_description,
        changed_by,
        changed_by_type,
        old_values,
        new_values,
        created_at
    ) VALUES (
        NEW.id,
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.transaction_status ELSE NULL END,
        NEW.transaction_status,
        action_type_val,
        change_description,
        COALESCE(NEW.verified_by, NEW.user_id),
        CASE WHEN NEW.verified_by IS NOT NULL THEN 'admin' ELSE 'user' END,
        old_vals,
        new_vals,
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log changes
DROP TRIGGER IF EXISTS trigger_log_transaction_history ON public.indb_payment_transactions;
CREATE TRIGGER trigger_log_transaction_history
    AFTER INSERT OR UPDATE ON public.indb_payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION log_transaction_history();

-- Grant permissions
GRANT SELECT ON public.indb_payment_transactions_history TO anon, authenticated;
GRANT INSERT ON public.indb_payment_transactions_history TO authenticated;