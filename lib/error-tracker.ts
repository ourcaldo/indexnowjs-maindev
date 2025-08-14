/**
 * Error Tracking System
 * Tracks and monitors rank checking errors for analysis and alerts
 */

import { supabaseAdmin } from './supabase'

// Simple console logger for development
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
}

interface RankCheckError {
  keywordId: string
  userId: string
  errorType: 'quota_exceeded' | 'api_error' | 'parsing_error' | 'network_error' | 'authentication_error'
  errorMessage: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  context?: any // Additional context data
}

interface ErrorStats {
  errorType: string
  count: number
  severity: string
  lastOccurrence: Date
  affectedUsers: number
  affectedKeywords: number
}

export class ErrorTracker {
  /**
   * Log error to analytics table for tracking and monitoring
   */
  async logError(error: RankCheckError): Promise<void> {
    try {
      logger.info(`Logging rank check error: ${error.errorType} for keyword ${error.keywordId}`)

      // Store in existing indb_analytics_error_stats table
      const { error: dbError } = await supabaseAdmin
        .from('indb_analytics_error_stats')
        .insert({
          error_date: error.timestamp.toISOString().split('T')[0], // YYYY-MM-DD
          user_id: error.userId,
          error_type: `rank_check_${error.errorType}`,
          severity: error.severity,
          error_count: 1,
          affected_endpoints: 1, // Each keyword check is an endpoint
          last_occurrence: error.timestamp.toISOString(),
          metadata: {
            keyword_id: error.keywordId,
            error_message: error.errorMessage,
            context: error.context || {},
            service: 'rank_tracking'
          }
        })

      if (dbError) {
        logger.error('Failed to log error to database:', dbError)
      } else {
        logger.info(`Error logged successfully for keyword ${error.keywordId}`)
      }

    } catch (error) {
      logger.error('Error tracking failed:', error)
    }
  }

  /**
   * Get error statistics for a specific user within date range
   */
  async getErrorStats(userId: string, dateRange: { start: Date, end: Date }): Promise<ErrorStats[]> {
    try {
      const startDate = dateRange.start.toISOString().split('T')[0]
      const endDate = dateRange.end.toISOString().split('T')[0]

      const { data: errors, error } = await supabaseAdmin
        .from('indb_analytics_error_stats')
        .select('*')
        .eq('user_id', userId)
        .like('error_type', 'rank_check_%')
        .gte('error_date', startDate)
        .lte('error_date', endDate)
        .order('last_occurrence', { ascending: false })

      if (error) {
        logger.error('Failed to get user error stats:', error)
        return []
      }

      // Group and aggregate errors by type
      const groupedErrors = this.aggregateErrors(errors || [])
      return groupedErrors

    } catch (error) {
      logger.error('Error getting user error stats:', error)
      return []
    }
  }

  /**
   * Get system-wide error statistics
   */
  async getSystemErrorStats(dateRange?: { start: Date, end: Date }): Promise<{
    totalErrors: number
    errorsByType: ErrorStats[]
    criticalErrors: number
    affectedUsers: number
    trends: any
  }> {
    try {
      let query = supabaseAdmin
        .from('indb_analytics_error_stats')
        .select('*')
        .like('error_type', 'rank_check_%')

      if (dateRange) {
        const startDate = dateRange.start.toISOString().split('T')[0]
        const endDate = dateRange.end.toISOString().split('T')[0]
        query = query.gte('error_date', startDate).lte('error_date', endDate)
      }

      const { data: errors, error } = await query.order('last_occurrence', { ascending: false })

      if (error) {
        logger.error('Failed to get system error stats:', error)
        return {
          totalErrors: 0,
          errorsByType: [],
          criticalErrors: 0,
          affectedUsers: 0,
          trends: {}
        }
      }

      // Calculate comprehensive statistics
      const totalErrors = (errors || []).reduce((sum, err) => sum + (err.error_count || 0), 0)
      const criticalErrors = (errors || []).filter(err => err.severity === 'critical').length
      const affectedUsers = new Set((errors || []).map(err => err.user_id)).size
      const errorsByType = this.aggregateErrors(errors || [])

      // Calculate trends (errors by date)
      const trends = this.calculateTrends(errors || [])

      return {
        totalErrors,
        errorsByType,
        criticalErrors,
        affectedUsers,
        trends
      }

    } catch (error) {
      logger.error('Error getting system error stats:', error)
      return {
        totalErrors: 0,
        errorsByType: [],
        criticalErrors: 0,
        affectedUsers: 0,
        trends: {}
      }
    }
  }

  /**
   * Get recent critical errors that need attention
   */
  async getCriticalErrors(hours: number = 24): Promise<any[]> {
    try {
      const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000)
      
      const { data: errors, error } = await supabaseAdmin
        .from('indb_analytics_error_stats')
        .select('*')
        .like('error_type', 'rank_check_%')
        .eq('severity', 'critical')
        .gte('last_occurrence', sinceDate.toISOString())
        .order('last_occurrence', { ascending: false })
        .limit(50)

      if (error) {
        logger.error('Failed to get critical errors:', error)
        return []
      }

      return errors || []

    } catch (error) {
      logger.error('Error getting critical errors:', error)
      return []
    }
  }

  /**
   * Clear old error logs (older than specified days)
   */
  async cleanupOldErrors(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

      const { error } = await supabaseAdmin
        .from('indb_analytics_error_stats')
        .delete()
        .like('error_type', 'rank_check_%')
        .lt('error_date', cutoffDateStr)

      if (error) {
        logger.error('Failed to cleanup old errors:', error)
      } else {
        logger.info(`Cleaned up error logs older than ${daysToKeep} days`)
      }

    } catch (error) {
      logger.error('Error during cleanup:', error)
    }
  }

  /**
   * Aggregate errors by type for statistics
   */
  private aggregateErrors(errors: any[]): ErrorStats[] {
    const grouped = new Map<string, {
      count: number
      severity: string
      lastOccurrence: Date
      userIds: Set<string>
      keywordIds: Set<string>
    }>()

    for (const error of errors) {
      const type = error.error_type
      const existing = grouped.get(type) || {
        count: 0,
        severity: error.severity,
        lastOccurrence: new Date(0),
        userIds: new Set(),
        keywordIds: new Set()
      }

      existing.count += error.error_count || 1
      existing.userIds.add(error.user_id)
      
      const lastOcc = new Date(error.last_occurrence)
      if (lastOcc > existing.lastOccurrence) {
        existing.lastOccurrence = lastOcc
        existing.severity = error.severity // Use most recent severity
      }

      // Extract keyword ID from metadata if available
      if (error.metadata?.keyword_id) {
        existing.keywordIds.add(error.metadata.keyword_id)
      }

      grouped.set(type, existing)
    }

    return Array.from(grouped.entries()).map(([errorType, data]) => ({
      errorType,
      count: data.count,
      severity: data.severity,
      lastOccurrence: data.lastOccurrence,
      affectedUsers: data.userIds.size,
      affectedKeywords: data.keywordIds.size
    }))
  }

  /**
   * Calculate error trends over time
   */
  private calculateTrends(errors: any[]): { [date: string]: number } {
    const trends: { [date: string]: number } = {}

    for (const error of errors) {
      const date = error.error_date
      trends[date] = (trends[date] || 0) + (error.error_count || 1)
    }

    return trends
  }

  /**
   * Determine error severity based on error type and context
   */
  static determineSeverity(errorType: string, errorMessage: string): 'low' | 'medium' | 'high' | 'critical' {
    if (errorType === 'quota_exceeded') {
      return 'high' // High because it blocks all operations
    }

    if (errorType === 'authentication_error') {
      return 'critical' // Critical because API key is invalid
    }

    if (errorType === 'api_error') {
      if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        return 'medium' // Temporary issue
      }
      return 'high' // Other API errors are significant
    }

    if (errorType === 'network_error') {
      return 'medium' // Usually temporary
    }

    return 'low' // Default for parsing errors etc.
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker()