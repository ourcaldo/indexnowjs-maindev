-- ================================================================================
-- SUPABASE SYSTEM TABLE COLUMN CHECKER
-- Run these queries first to get the exact column names for system tables
-- ================================================================================

-- 1. Check pg_stat_user_indexes columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pg_stat_user_indexes' 
ORDER BY ordinal_position;

-- 2. Check pg_policies columns  
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pg_policies' 
ORDER BY ordinal_position;

-- 3. Check pg_stat_user_tables columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pg_stat_user_tables' 
ORDER BY ordinal_position;

-- 4. Check pg_indexes columns (you already provided this)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pg_indexes' 
ORDER BY ordinal_position;