/**
 * Quota Monitor Service
 * Monitors API quota usage and provides alerts and reports
 */

import { supabaseAdmin } from '../database/supabase'
import { APIKeyManager } from '../rank-tracking/api-key-manager'
import { ErrorType } from './error-handling'

// Simple console logger for development
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
}

interface QuotaStatus {
  totalQuota: number
  usedQuota: number
  remainingQuota: number
  utilizationPercentage: number
  activeKeys: number
  exhaustedKeys: number
  status: 'healthy' | 'warning' | 'critical' | 'exhausted'
}

interface QuotaAlert {
  level: 'warning' | 'critical' | 'exhausted'
  message: string
  remainingQuota: number
  utilizationPercentage: number
  affectedKeys: number
  timestamp: Date
}

interface QuotaReport {
  reportDate: Date
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  quotaEfficiency: number
  topErrorTypes: Array<{ type: string, count: number }>
  dailyUsageTrend: Array<{ date: string, usage: number }>
  recommendations: string[]
}

export class QuotaMonitor {
  private apiKeyManager: APIKeyManager

  constructor() {
    this.apiKeyManager = new APIKeyManager()
  }

  /**
   * Check overall quota health across all API keys
   */
  async checkQuotaHealth(): Promise<QuotaStatus> {
    try {
      // Get all ScrapingDog integrations
      const { data: integrations, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('service_name', 'scrapingdog')

      if (error || !integrations) {
        logger.error('Failed to get integrations for quota health check:', error)
        return {
          totalQuota: 0,
          usedQuota: 0,
          remainingQuota: 0,
          utilizationPercentage: 0,
          activeKeys: 0,
          exhaustedKeys: 0,
          status: 'critical'
        }
      }

      // Calculate aggregate statistics
      let totalQuota = 0
      let usedQuota = 0
      let activeKeys = 0
      let exhaustedKeys = 0

      for (const integration of integrations) {
        totalQuota += integration.api_quota_limit || 0
        usedQuota += integration.api_quota_used || 0
        
        if (integration.is_active) {
          activeKeys++
        } else {
          exhaustedKeys++
        }
      }

      const remainingQuota = totalQuota - usedQuota
      const utilizationPercentage = totalQuota > 0 ? (usedQuota / totalQuota) * 100 : 0

      // Determine status
      let status: 'healthy' | 'warning' | 'critical' | 'exhausted'
      if (activeKeys === 0) {
        status = 'exhausted'
      } else if (utilizationPercentage >= 90) {
        status = 'critical'
      } else if (utilizationPercentage >= 75) {
        status = 'warning'
      } else {
        status = 'healthy'
      }

      const quotaStatus = {
        totalQuota,
        usedQuota,
        remainingQuota,
        utilizationPercentage: Math.round(utilizationPercentage * 10) / 10, // Round to 1 decimal
        activeKeys,
        exhaustedKeys,
        status
      }

      // Log quota alerts if needed
      await this.handleQuotaAlerts(quotaStatus)

      return quotaStatus

    } catch (error) {
      logger.error('Error checking quota health:', error)
      return {
        totalQuota: 0,
        usedQuota: 0,
        remainingQuota: 0,
        utilizationPercentage: 0,
        activeKeys: 0,
        exhaustedKeys: 0,
        status: 'critical'
      }
    }
  }

  /**
   * Handle quota alerts and notifications
   */
  private async handleQuotaAlerts(quotaStatus: QuotaStatus): Promise<void> {
    const alerts: QuotaAlert[] = []

    // Generate appropriate alerts
    if (quotaStatus.status === 'exhausted') {
      alerts.push({
        level: 'exhausted',
        message: 'All API keys have been exhausted. Rank tracking is currently disabled.',
        remainingQuota: quotaStatus.remainingQuota,
        utilizationPercentage: quotaStatus.utilizationPercentage,
        affectedKeys: quotaStatus.exhaustedKeys,
        timestamp: new Date()
      })
    } else if (quotaStatus.status === 'critical') {
      alerts.push({
        level: 'critical',
        message: `Critical quota usage: ${quotaStatus.utilizationPercentage}% used. Only ${quotaStatus.remainingQuota} requests remaining.`,
        remainingQuota: quotaStatus.remainingQuota,
        utilizationPercentage: quotaStatus.utilizationPercentage,
        affectedKeys: quotaStatus.activeKeys,
        timestamp: new Date()
      })
    } else if (quotaStatus.status === 'warning') {
      alerts.push({
        level: 'warning',
        message: `High quota usage: ${quotaStatus.utilizationPercentage}% used. Consider monitoring usage closely.`,
        remainingQuota: quotaStatus.remainingQuota,
        utilizationPercentage: quotaStatus.utilizationPercentage,
        affectedKeys: quotaStatus.activeKeys,
        timestamp: new Date()
      })
    }

    // Log alerts for admin monitoring only (NOT user-facing)
    for (const alert of alerts) {
      await this.storeQuotaAlert(alert)
    }
  }

  /**
   * Store quota alert in admin logs only (NOT user notifications)
   */
  private async storeQuotaAlert(alert: QuotaAlert): Promise<void> {
    try {
      // Log quota alerts to console and system logs only
      // This is site-level infrastructure - users should NOT see these alerts
      if (alert.level === 'critical' || alert.level === 'exhausted') {
        logger.error(`🚨 ADMIN ALERT: ${alert.message}`)
      } else {
        logger.warn(`⚠️ ADMIN WARNING: ${alert.message}`)
      }

      // Store in system error logs for admin tracking only
      const { error } = await supabaseAdmin
        .from('indb_system_error_logs')
        .insert({
          // Let database generate UUID with gen_random_uuid() - don't set id manually
          user_id: null, // System-level alerts have no specific user - use null to avoid foreign key constraint
          error_type: ErrorType.SYSTEM,
          severity: (alert.level === 'critical' || alert.level === 'exhausted' ? 'CRITICAL' : 'MEDIUM'),
          message: alert.message,
          user_message: `Quota ${alert.level}: ${alert.message}`,
          endpoint: '/api/admin/quota/health',
          http_method: 'GET',
          status_code: 200,
          metadata: {
            alert_level: alert.level,
            remaining_quota: alert.remainingQuota,
            utilization_percentage: alert.utilizationPercentage,
            affected_keys: alert.affectedKeys,
            notification_type: 'admin_quota_alert',
            error_date: new Date().toISOString().split('T')[0],
            affected_endpoints: 1
          },
          stack_trace: null
          // created_at will be auto-generated by database with now() default
        })

      if (error) {
        logger.error('Failed to log quota alert to analytics:', error)
      }

    } catch (error) {
      logger.error('Error logging quota alert:', error)
    }
  }

  /**
   * Generate comprehensive quota usage report
   */
  async generateQuotaReport(days: number = 30): Promise<QuotaReport> {
    try {
      const endDate = new Date()
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      // Get rank checking activity for the period
      const { data: rankHistory, error: historyError } = await supabaseAdmin
        .from('indb_keyword_rank_history')
        .select('check_date, position')
        .gte('check_date', startDate.toISOString().split('T')[0])
        .lte('check_date', endDate.toISOString().split('T')[0])

      if (historyError) {
        logger.error('Failed to get rank history for report:', historyError)
      }

      // Get error statistics for the period
      const { data: errors, error: errorError } = await supabaseAdmin
        .from('indb_system_error_logs')
        .select('error_type, created_at')
        .like('error_type', 'rank_check_%')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (errorError) {
        logger.error('Failed to get error stats for report:', errorError)
      }

      // Calculate statistics
      const totalRequests = (rankHistory || []).length
      const successfulRequests = (rankHistory || []).filter(r => r.position !== null).length
      const failedRequests = totalRequests - successfulRequests
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0

      // Calculate quota efficiency (successful requests per quota used)
      const quotaUsed = await this.getQuotaUsedInPeriod(startDate, endDate)
      const quotaEfficiency = quotaUsed > 0 ? (successfulRequests / quotaUsed) * 100 : 0

      // Top error types
      const errorCounts = new Map<string, number>()
      for (const error of errors || []) {
        const type = error.error_type.replace('rank_check_', '')
        errorCounts.set(type, (errorCounts.get(type) || 0) + 1)
      }
      const topErrorTypes = Array.from(errorCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Daily usage trend
      const dailyUsage = new Map<string, number>()
      for (const record of rankHistory || []) {
        const date = record.check_date
        dailyUsage.set(date, (dailyUsage.get(date) || 0) + 1)
      }
      const dailyUsageTrend = Array.from(dailyUsage.entries())
        .map(([date, usage]) => ({ date, usage }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        successRate,
        quotaEfficiency,
        topErrorTypes,
        totalRequests,
        quotaUsed
      })

      return {
        reportDate: new Date(),
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: Math.round(successRate * 10) / 10,
        quotaEfficiency: Math.round(quotaEfficiency * 10) / 10,
        topErrorTypes,
        dailyUsageTrend,
        recommendations
      }

    } catch (error) {
      logger.error('Error generating quota report:', error)
      return {
        reportDate: new Date(),
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        quotaEfficiency: 0,
        topErrorTypes: [],
        dailyUsageTrend: [],
        recommendations: ['Error generating report. Please check system logs.']
      }
    }
  }

  /**
   * Get quota used in a specific period (estimate based on successful requests)
   */
  private async getQuotaUsedInPeriod(startDate: Date, endDate: Date): Promise<number> {
    try {
      // Get count of rank checks in period
      const { count, error } = await supabaseAdmin
        .from('indb_keyword_rank_history')
        .select('id', { count: 'exact', head: true })
        .gte('check_date', startDate.toISOString().split('T')[0])
        .lte('check_date', endDate.toISOString().split('T')[0])

      if (error) {
        logger.error('Failed to get quota usage count:', error)
        return 0
      }

      // Each successful rank check uses 10 quota
      return (count || 0) * 10

    } catch (error) {
      logger.error('Error calculating quota usage:', error)
      return 0
    }
  }

  /**
   * Generate recommendations based on usage patterns
   */
  private generateRecommendations(stats: {
    successRate: number
    quotaEfficiency: number
    topErrorTypes: Array<{ type: string, count: number }>
    totalRequests: number
    quotaUsed: number
  }): string[] {
    const recommendations: string[] = []

    // Success rate recommendations
    if (stats.successRate < 80) {
      recommendations.push(`Success rate is low (${stats.successRate}%). Consider checking API key validity and network connectivity.`)
    }

    // Quota efficiency recommendations
    if (stats.quotaEfficiency < 70) {
      recommendations.push(`Quota efficiency is low (${stats.quotaEfficiency}%). Many API calls are failing - investigate error patterns.`)
    }

    // Error-specific recommendations
    for (const errorType of stats.topErrorTypes) {
      if (errorType.type === 'quota_exceeded' && errorType.count > 0) {
        recommendations.push('Add more API keys or increase quota limits to avoid service interruptions.')
      }
      if (errorType.type === 'api_error' && errorType.count > stats.totalRequests * 0.1) {
        recommendations.push('High API error rate detected. Check ScrapingDog service status and API key validity.')
      }
      if (errorType.type === 'network_error' && errorType.count > 0) {
        recommendations.push('Network errors detected. Consider implementing retry mechanisms with exponential backoff.')
      }
    }

    // Usage pattern recommendations
    if (stats.totalRequests > 1000) {
      recommendations.push('High usage detected. Consider spreading checks throughout the day to avoid rate limits.')
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is good. Monitor regularly to maintain optimal efficiency.')
    }

    return recommendations
  }

  /**
   * Get current quota status for all API keys
   */
  async getAllQuotaStatus(): Promise<Array<{
    id: string
    apiKeyMask: string
    quotaLimit: number
    quotaUsed: number
    quotaRemaining: number
    utilizationPercentage: number
    isActive: boolean
    status: string
  }>> {
    try {
      const { data: integrations, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('service_name', 'scrapingdog')
        .order('created_at')

      if (error || !integrations) {
        logger.error('Failed to get quota status:', error)
        return []
      }

      return integrations.map(integration => {
        const quotaRemaining = integration.api_quota_limit - integration.api_quota_used
        const utilizationPercentage = integration.api_quota_limit > 0 
          ? (integration.api_quota_used / integration.api_quota_limit) * 100 
          : 0

        let status = 'healthy'
        if (!integration.is_active) {
          status = 'exhausted'
        } else if (utilizationPercentage >= 90) {
          status = 'critical'
        } else if (utilizationPercentage >= 75) {
          status = 'warning'
        }

        return {
          id: integration.id,
          apiKeyMask: integration.scrappingdog_apikey.slice(0, 8) + '...',
          quotaLimit: integration.api_quota_limit,
          quotaUsed: integration.api_quota_used,
          quotaRemaining,
          utilizationPercentage: Math.round(utilizationPercentage * 10) / 10,
          isActive: integration.is_active,
          status
        }
      })

    } catch (error) {
      logger.error('Error getting all quota status:', error)
      return []
    }
  }
}

// Export singleton instance
export const quotaMonitor = new QuotaMonitor()