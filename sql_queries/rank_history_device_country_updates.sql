-- SQL Queries to Update Device Type and Country Data in Rank History Tables
-- Run these queries in Supabase SQL Editor to populate device_type and country_id in rank history tables

-- 1. First, ensure the columns exist in the rank history table
ALTER TABLE indb_keyword_rank_history 
ADD COLUMN IF NOT EXISTS device_type text,
ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES indb_keyword_countries(id);

-- 2. Update device_type and country_id in rank history table from keywords table
UPDATE indb_keyword_rank_history 
SET 
  device_type = k.device_type,
  country_id = k.country_id
FROM indb_keyword_keywords k
WHERE indb_keyword_rank_history.keyword_id = k.id
  AND (indb_keyword_rank_history.device_type IS NULL 
       OR indb_keyword_rank_history.country_id IS NULL);

-- 3. Ensure the columns exist in the rankings table (current positions)
ALTER TABLE indb_keyword_rankings 
ADD COLUMN IF NOT EXISTS device_type text,
ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES indb_keyword_countries(id);

-- 4. Update device_type and country_id in rankings table from keywords table
UPDATE indb_keyword_rankings 
SET 
  device_type = k.device_type,
  country_id = k.country_id
FROM indb_keyword_keywords k
WHERE indb_keyword_rankings.keyword_id = k.id
  AND (indb_keyword_rankings.device_type IS NULL 
       OR indb_keyword_rankings.country_id IS NULL);

-- 5. Create indexes for better performance on filters
CREATE INDEX IF NOT EXISTS idx_rank_history_device_type 
  ON indb_keyword_rank_history(device_type);

CREATE INDEX IF NOT EXISTS idx_rank_history_country_id 
  ON indb_keyword_rank_history(country_id);

CREATE INDEX IF NOT EXISTS idx_rankings_device_type 
  ON indb_keyword_rankings(device_type);

CREATE INDEX IF NOT EXISTS idx_rankings_country_id 
  ON indb_keyword_rankings(country_id);

-- 6. Create a trigger to automatically populate device_type and country_id 
-- when new rank history records are inserted
CREATE OR REPLACE FUNCTION populate_rank_history_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Get device_type and country_id from the keywords table
  SELECT device_type, country_id
  INTO NEW.device_type, NEW.country_id
  FROM indb_keyword_keywords
  WHERE id = NEW.keyword_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_populate_rank_history_metadata ON indb_keyword_rank_history;

-- Create trigger for rank history
CREATE TRIGGER trigger_populate_rank_history_metadata
  BEFORE INSERT ON indb_keyword_rank_history
  FOR EACH ROW
  EXECUTE FUNCTION populate_rank_history_metadata();

-- 7. Create a trigger for rankings table as well
CREATE OR REPLACE FUNCTION populate_rankings_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Get device_type and country_id from the keywords table
  SELECT device_type, country_id
  INTO NEW.device_type, NEW.country_id
  FROM indb_keyword_keywords
  WHERE id = NEW.keyword_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_populate_rankings_metadata ON indb_keyword_rankings;

-- Create trigger for rankings
CREATE TRIGGER trigger_populate_rankings_metadata
  BEFORE INSERT ON indb_keyword_rankings
  FOR EACH ROW
  EXECUTE FUNCTION populate_rankings_metadata();

-- 8. Verify the updates (optional - check data)
-- SELECT 
--   rh.id,
--   rh.keyword_id,
--   rh.device_type,
--   rh.country_id,
--   k.keyword,
--   c.name as country_name
-- FROM indb_keyword_rank_history rh
-- JOIN indb_keyword_keywords k ON rh.keyword_id = k.id
-- LEFT JOIN indb_keyword_countries c ON rh.country_id = c.id
-- ORDER BY rh.check_date DESC
-- LIMIT 10;