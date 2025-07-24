-- ========================================
-- IndexNow Pro Error Handling System
-- Database Schema Update for P1.4
-- ========================================

-- Create the system error logs table for comprehensive error tracking
CREATE TABLE IF NOT EXISTS indb_system_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL CHECK (error_type IN (
    'AUTHENTICATION',
    'AUTHORIZATION', 
    'VALIDATION',
    'DATABASE',
    'EXTERNAL_API',
    'ENCRYPTION',
    'RATE_LIMITING',
    'SYSTEM',
    'NETWORK',
    'BUSINESS_LOGIC'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  message TEXT NOT NULL,
  user_message TEXT NOT NULL,
  endpoint TEXT,
  http_method TEXT CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  status_code INTEGER,
  metadata JSONB,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_indb_system_error_logs_user_id ON indb_system_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_indb_system_error_logs_error_type ON indb_system_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_indb_system_error_logs_severity ON indb_system_error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_indb_system_error_logs_created_at ON indb_system_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_indb_system_error_logs_endpoint ON indb_system_error_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_indb_system_error_logs_status_code ON indb_system_error_logs(status_code);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_indb_system_error_logs_user_severity_date ON indb_system_error_logs(user_id, severity, created_at DESC);

-- Create the error analytics view for dashboard reporting
CREATE OR REPLACE VIEW indb_error_analytics AS
SELECT 
  DATE(created_at) as error_date,
  user_id,
  error_type,
  severity,
  COUNT(*) as error_count,
  COUNT(DISTINCT endpoint) as affected_endpoints,
  MAX(created_at) as last_occurrence
FROM indb_system_error_logs 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), user_id, error_type, severity
ORDER BY error_date DESC, error_count DESC;

-- Create RLS policies for error logs (users can only see their own errors)
ALTER TABLE indb_system_error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own error logs
CREATE POLICY "Users can view own error logs" ON indb_system_error_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: System can insert error logs (no user restriction for system errors)
CREATE POLICY "System can insert error logs" ON indb_system_error_logs
  FOR INSERT WITH CHECK (true);

-- Policy: System can update error logs
CREATE POLICY "System can update error logs" ON indb_system_error_logs
  FOR UPDATE USING (true);

-- Add comments for documentation
COMMENT ON TABLE indb_system_error_logs IS 'Comprehensive error logging for the IndexNow Pro application with structured error tracking, security logging, and analytics support';
COMMENT ON COLUMN indb_system_error_logs.error_type IS 'Categorized error type for filtering and analytics';
COMMENT ON COLUMN indb_system_error_logs.severity IS 'Error severity level for prioritization and alerting';
COMMENT ON COLUMN indb_system_error_logs.user_message IS 'User-friendly error message displayed to end users';
COMMENT ON COLUMN indb_system_error_logs.message IS 'Technical error message for developers and debugging';
COMMENT ON COLUMN indb_system_error_logs.metadata IS 'Additional context and metadata in JSON format';
COMMENT ON COLUMN indb_system_error_logs.stack_trace IS 'Full stack trace for debugging (development only)';

-- ========================================
-- Performance Optimization Updates
-- ========================================

-- Update existing tables with better error handling support
-- Add error correlation IDs to existing logs if needed
ALTER TABLE indb_indexing_job_logs 
ADD COLUMN IF NOT EXISTS correlation_id UUID,
ADD COLUMN IF NOT EXISTS error_severity TEXT CHECK (error_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_indb_system_error_logs_updated_at 
    BEFORE UPDATE ON indb_system_error_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Data Cleanup and Maintenance
-- ========================================

-- Create function to clean up old error logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM indb_system_error_logs 
    WHERE created_at < NOW() - INTERVAL '90 days'
      AND severity IN ('LOW', 'MEDIUM');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO indb_system_error_logs (
        error_type, 
        severity, 
        message, 
        user_message, 
        endpoint,
        metadata
    ) VALUES (
        'SYSTEM',
        'LOW',
        'Automated error log cleanup completed',
        'System maintenance completed',
        '/system/cleanup',
        jsonb_build_object('deleted_count', deleted_count)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON indb_system_error_logs TO authenticated;
GRANT INSERT ON indb_system_error_logs TO service_role;
GRANT UPDATE ON indb_system_error_logs TO service_role;
GRANT DELETE ON indb_system_error_logs TO service_role;

-- Grant permissions on the analytics view
GRANT SELECT ON indb_error_analytics TO authenticated;

-- ========================================
-- IMPORTANT NOTES FOR IMPLEMENTATION
-- ========================================

/*
After running this SQL schema update:

1. The error handling system will have comprehensive database support
2. All errors will be tracked with structured logging
3. Users can only access their own error logs via RLS policies
4. System errors are recorded for monitoring and debugging
5. Analytics view provides insights into error patterns
6. Automatic cleanup prevents database bloat
7. Performance indexes ensure fast queries even with large datasets

Next steps in the application:
- Replace all console.log statements with structured logging
- Update API routes to use the new error handling system
- Implement user-friendly error messages in frontend
- Add error monitoring dashboard for administrators
*/