-- IndexNow Pro Backend Processing Database Schema Updates
-- Run this SQL in your Supabase SQL Editor

-- Add encrypted access token column to service accounts table
ALTER TABLE indb_google_service_accounts 
ADD COLUMN IF NOT EXISTS encrypted_access_token TEXT,
ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Add job processing lock mechanism
ALTER TABLE indb_indexing_jobs
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS locked_by TEXT;

-- Create indexes for efficient job monitoring
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_status_next_run 
ON indb_indexing_jobs(status, next_run_at) 
WHERE status IN ('pending', 'scheduled');

CREATE INDEX IF NOT EXISTS idx_indexing_jobs_locked 
ON indb_indexing_jobs(locked_at, status) 
WHERE status = 'running';

-- Create index for service account token management
CREATE INDEX IF NOT EXISTS idx_service_accounts_token_expiry 
ON indb_google_service_accounts(access_token_expires_at) 
WHERE encrypted_access_token IS NOT NULL;

-- Add RLS policies for new columns if needed
-- (The existing RLS policies should automatically cover the new columns)

-- Comment: These changes add:
-- 1. Encrypted access token storage for Google service accounts
-- 2. Job locking mechanism to prevent multiple workers processing same job
-- 3. Database indexes for efficient job monitoring and processing
-- 4. All changes use IF NOT EXISTS to prevent errors on re-runs