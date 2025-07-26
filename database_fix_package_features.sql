-- Fix package features to remove hardcoded conflicts
-- Run this in Supabase SQL Editor

-- Update Free package features (only database features, no hardcoded ones)
UPDATE indb_payment_packages 
SET features = '["Max. 1 Service Account", "50 Daily Quota for IndexNow"]'::jsonb
WHERE name = 'Free';

-- Update Premium package features  
UPDATE indb_payment_packages 
SET features = '["Max. 5 Service Accounts", "1,000 Daily Quota for IndexNow", "Priority Support"]'::jsonb
WHERE name = 'Premium';

-- Update Pro package features
UPDATE indb_payment_packages 
SET features = '["Unlimited Service Accounts", "Unlimited Daily URLs", "Unlimited Concurrent Jobs", "24/7 Premium Support", "Advanced Analytics"]'::jsonb
WHERE name = 'Pro';

-- Verify the changes
SELECT name, features FROM indb_payment_packages ORDER BY sort_order;