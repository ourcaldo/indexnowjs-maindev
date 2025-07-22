-- Fix IndexNow Pro Database Status Constraints
-- Run this SQL in your Supabase SQL Editor to fix status validation issues

-- 1. First, check if there's an existing status constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%indb_indexing_jobs_status%';

-- 2. Drop existing constraint if it exists (replace CONSTRAINT_NAME with actual name from step 1)
-- ALTER TABLE indb_indexing_jobs DROP CONSTRAINT IF EXISTS indb_indexing_jobs_status_check;

-- 3. Add proper status constraint with all valid statuses
ALTER TABLE indb_indexing_jobs 
ADD CONSTRAINT indb_indexing_jobs_status_check 
CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused', 'cancelled'));

-- 4. Update any invalid status values to valid ones
UPDATE indb_indexing_jobs 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'running', 'completed', 'failed', 'paused', 'cancelled');

-- 5. Add the new columns for job locking if they don't exist
ALTER TABLE indb_indexing_jobs 
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS locked_by TEXT;

-- 6. Create indexes for efficient job monitoring
CREATE INDEX IF NOT EXISTS idx_indexing_jobs_status_pending 
ON indb_indexing_jobs(status, next_run_at, locked_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_indexing_jobs_locked 
ON indb_indexing_jobs(locked_at, status) 
WHERE locked_at IS NOT NULL;

-- 7. Verify the changes
SELECT 
  status, 
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM indb_indexing_jobs 
GROUP BY status 
ORDER BY status;

-- Comment: 
-- This script fixes the database status constraint issue that was causing 
-- the "retry" status error. Now all job status updates will work properly.
-- The valid statuses are: pending, running, completed, failed, paused, cancelled