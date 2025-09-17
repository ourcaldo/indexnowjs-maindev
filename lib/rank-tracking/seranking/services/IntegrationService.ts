/**
 * Integration Service
 * Manages SeRanking API integration settings, quota management, and usage tracking
 */

import {
  ServiceResponse,
  IntegrationSettings,
  QuotaStatus,
  QuotaAlert,
  HealthCheckResult,
  SeRankingErrorType,
  RateLimitConfig,
  ApiMetrics
} from '../types/SeRankingTypes';
import { IIntegrationService, ISeRankingApiClient } from '../types/ServiceTypes';
import { supabaseAdmin } from '../../../database/supabase';
import { Database } from '../../../database/database-types';

// Configuration interface for the service
export interface IntegrationServiceConfig {
  defaultQuotaLimit: number;
  defaultResetInterval: 'daily' | 'monthly';
  quotaWarningThreshold: number; // 0.8 = 80%
  quotaCriticalThreshold: number; // 0.95 = 95%
  healthCheckInterval: number; // minutes
  usageReportingInterval: number; // minutes
  enableAutoQuotaReset: boolean;
  enableUsageAlerts: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Database types for SeRanking integration settings
interface IntegrationRow {
  id: string;
  user_id: string;
  service_name: string;
  api_key: string;
  api_url: string;
  api_quota_limit: number;
  api_quota_used: number;
  quota_reset_date: string;
  quota_reset_interval: string;
  is_active: boolean;
  rate_limits: any;
  alert_settings: any;
  last_health_check: string | null;
  health_status: string;
  created_at: string;
  updated_at: string;
}

interface UsageLogRow {
  id: string;
  integration_id: string;
  operation_type: string;
  request_count: number;
  successful_requests: number;
  failed_requests: number;
  response_time_ms: number | null;
  timestamp: string;
  date: string;
  metadata: any | null;
}

// Usage report types
export interface UsageReport {
  period: {
    start: Date;
    end: Date;
    type: 'daily' | 'weekly' | 'monthly';
  };
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  quota_usage: {
    used: number;
    limit: number;
    percentage: number;
    remaining: number;
  };
  daily_breakdown: Array<{
    date: string;
    requests: number;
    success_rate: number;
  }>;
  operation_breakdown: Record<string, {
    requests: number;
    success_rate: number;
    avg_response_time: number;
  }>;
  peak_usage_day: string;
  peak_usage_count: number;
}

export class IntegrationService implements IIntegrationService {
  private config: IntegrationServiceConfig;
  private apiClient?: ISeRankingApiClient;
  private activeAlerts: Map<string, Date> = new Map();
  private lastHealthCheck?: HealthCheckResult;
  private metrics: ApiMetrics;

  constructor(
    config: Partial<IntegrationServiceConfig> = {},
    apiClient?: ISeRankingApiClient
  ) {
    this.config = {
      defaultQuotaLimit: 10000,
      defaultResetInterval: 'monthly',
      quotaWarningThreshold: 0.8,
      quotaCriticalThreshold: 0.95,
      healthCheckInterval: 30,
      usageReportingInterval: 60,
      enableAutoQuotaReset: true,
      enableUsageAlerts: true,
      logLevel: 'info',
      ...config
    };

    this.apiClient = apiClient;
    
    this.metrics = {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      average_response_time: 0,
      cache_hits: 0,
      cache_misses: 0
    };

    // Initialize periodic tasks
    this.initializePeriodicTasks();
  }

  /**
   * Get SeRanking integration settings
   */
  async getIntegrationSettings(userId?: string): Promise<ServiceResponse<{
    service_name: string;
    api_url: string;
    api_quota_limit: number;
    api_quota_used: number;
    quota_reset_date: Date;
    is_active: boolean;
  }>> {
    try {
      const { data, error } = await supabaseAdmin
        .from('indb_seranking_integrations')
        .select('*')
        .eq('user_id', userId || 'system')
        .eq('service_name', 'seranking')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // Return default settings if no integration found
        return {
          success: true,
          data: {
            service_name: 'seranking',
            api_url: 'https://api.seranking.com',
            api_quota_limit: this.config.defaultQuotaLimit,
            api_quota_used: 0,
            quota_reset_date: this.calculateNextResetDate(),
            is_active: false
          },
          metadata: {
            source: 'cache',
            timestamp: new Date()
          }
        };
      }

      return {
        success: true,
        data: {
          service_name: data.service_name,
          api_url: data.api_url,
          api_quota_limit: data.api_quota_limit,
          api_quota_used: data.api_quota_used,
          quota_reset_date: new Date(data.quota_reset_date),
          is_active: data.is_active
        },
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', 'Failed to get integration settings:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to retrieve integration settings: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Update integration settings
   */
  async updateIntegrationSettings(
    settings: {
      api_quota_limit?: number;
      is_active?: boolean;
      api_key?: string;
      api_url?: string;
      rate_limits?: RateLimitConfig;
      alert_settings?: {
        quota_alerts: QuotaAlert[];
        error_notifications: boolean;
        performance_alerts: boolean;
      };
    },
    userId?: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const updateData: Partial<IntegrationRow> = {
        updated_at: new Date().toISOString()
      };

      if (settings.api_quota_limit !== undefined) {
        updateData.api_quota_limit = settings.api_quota_limit;
      }
      if (settings.is_active !== undefined) {
        updateData.is_active = settings.is_active;
      }
      if (settings.api_key !== undefined) {
        updateData.api_key = settings.api_key;
      }
      if (settings.api_url !== undefined) {
        updateData.api_url = settings.api_url;
      }
      if (settings.rate_limits !== undefined) {
        updateData.rate_limits = settings.rate_limits;
      }
      if (settings.alert_settings !== undefined) {
        updateData.alert_settings = settings.alert_settings;
      }

      const { error } = await supabaseAdmin
        .from('indb_seranking_integrations')
        .upsert({
          user_id: userId || 'system',
          service_name: 'seranking',
          ...updateData
        });

      if (error) {
        throw error;
      }

      this.log('info', 'Integration settings updated successfully');
      
      return {
        success: true,
        data: true,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', 'Failed to update integration settings:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to update integration settings: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Record API usage
   */
  async recordApiUsage(
    requestCount: number = 1,
    options: {
      operationType?: string;
      userId?: string;
      responseTime?: number;
      successful?: boolean;
      metadata?: any;
    } = {}
  ): Promise<ServiceResponse<boolean>> {
    try {
      const {
        operationType = 'keyword_export',
        userId = 'system',
        responseTime,
        successful = true,
        metadata
      } = options;

      // Get current integration
      const integrationResult = await this.getIntegrationSettings(userId);
      if (!integrationResult.success) {
        throw new Error('Failed to get integration settings');
      }

      // Update quota usage in integration table
      const { error: updateError } = await supabaseAdmin
        .from('indb_seranking_integrations')
        .update({
          api_quota_used: integrationResult.data!.api_quota_used + requestCount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('service_name', 'seranking');

      if (updateError) {
        throw updateError;
      }

      // Log usage details
      const today = new Date().toISOString().split('T')[0];
      const { error: logError } = await supabaseAdmin
        .from('indb_seranking_usage_logs')
        .insert({
          integration_id: `${userId}_seranking`,
          operation_type: operationType,
          request_count: requestCount,
          successful_requests: successful ? requestCount : 0,
          failed_requests: successful ? 0 : requestCount,
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
          date: today,
          metadata
        });

      if (logError) {
        this.log('warn', 'Failed to log usage details:', logError);
        // Don't fail the entire operation if logging fails
      }

      // Update internal metrics
      this.metrics.total_requests += requestCount;
      if (successful) {
        this.metrics.successful_requests += requestCount;
      } else {
        this.metrics.failed_requests += requestCount;
      }

      if (responseTime) {
        const totalResponseTime = this.metrics.average_response_time * (this.metrics.total_requests - requestCount);
        this.metrics.average_response_time = (totalResponseTime + responseTime) / this.metrics.total_requests;
      }

      // Check quota thresholds and trigger alerts if needed
      await this.checkQuotaThresholds(userId);

      return {
        success: true,
        data: true,
        metadata: {
          source: 'api',
          timestamp: new Date(),
          quota_remaining: integrationResult.data!.api_quota_limit - (integrationResult.data!.api_quota_used + requestCount)
        }
      };
    } catch (error) {
      this.log('error', 'Failed to record API usage:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to record API usage: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Reset quota usage
   */
  async resetQuotaUsage(userId?: string): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await supabaseAdmin
        .from('indb_seranking_integrations')
        .update({
          api_quota_used: 0,
          quota_reset_date: this.calculateNextResetDate().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId || 'system')
        .eq('service_name', 'seranking');

      if (error) {
        throw error;
      }

      this.log('info', `Quota usage reset for user: ${userId || 'system'}`);
      
      return {
        success: true,
        data: true,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', 'Failed to reset quota usage:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to reset quota usage: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Test integration health
   */
  async testIntegration(userId?: string): Promise<ServiceResponse<HealthCheckResult>> {
    const startTime = Date.now();
    
    try {
      const settingsResult = await this.getIntegrationSettings(userId);
      if (!settingsResult.success || !settingsResult.data?.is_active) {
        const result: HealthCheckResult = {
          status: 'unhealthy',
          last_check: new Date(),
          error_message: 'Integration is not active or not configured'
        };
        
        await this.updateHealthStatus(result, userId);
        return {
          success: true,
          data: result,
          metadata: {
            source: 'api',
            timestamp: new Date()
          }
        };
      }

      // Test API connection if client is available
      let result: HealthCheckResult;
      
      if (this.apiClient) {
        try {
          result = await this.apiClient.testConnection();
          result.response_time = Date.now() - startTime;
        } catch (error) {
          result = {
            status: 'unhealthy',
            last_check: new Date(),
            error_message: `API connection failed: ${error}`,
            response_time: Date.now() - startTime
          };
        }
      } else {
        result = {
          status: 'degraded',
          last_check: new Date(),
          warning: 'API client not available for health check',
          response_time: Date.now() - startTime
        };
      }

      // Update health status in database
      await this.updateHealthStatus(result, userId);
      
      this.lastHealthCheck = result;
      
      return {
        success: true,
        data: result,
        metadata: {
          source: 'api',
          timestamp: new Date(),
          response_time: result.response_time
        }
      };
    } catch (error) {
      const result: HealthCheckResult = {
        status: 'unhealthy',
        last_check: new Date(),
        error_message: `Health check failed: ${error}`,
        response_time: Date.now() - startTime
      };
      
      await this.updateHealthStatus(result, userId);
      
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Integration health check failed: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string, userId?: string): Promise<ServiceResponse<{
    isValid: boolean;
    keyInfo?: {
      permissions: string[];
      quotaLimit: number;
      quotaUsed: number;
    };
  }>> {
    try {
      if (!apiKey || apiKey.trim().length === 0) {
        return {
          success: true,
          data: {
            isValid: false
          }
        };
      }

      // Test the API key by making a simple request
      if (this.apiClient) {
        try {
          const healthResult = await this.apiClient.testConnection();
          if (healthResult.status === 'healthy') {
            return {
              success: true,
              data: {
                isValid: true,
                keyInfo: {
                  permissions: ['keyword_export'], // SeRanking doesn't provide detailed permissions
                  quotaLimit: 10000, // Default quota
                  quotaUsed: 0
                }
              }
            };
          } else {
            return {
              success: true,
              data: {
                isValid: false
              }
            };
          }
        } catch (error) {
          this.log('warn', 'API key validation failed:', error);
          return {
            success: true,
            data: {
              isValid: false
            }
          };
        }
      }

      // If no API client available, just check format
      const isValidFormat = /^[A-Za-z0-9_-]{20,}$/.test(apiKey);
      
      return {
        success: true,
        data: {
          isValid: isValidFormat
        }
      };
    } catch (error) {
      this.log('error', 'Failed to validate API key:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.AUTHENTICATION_ERROR,
          message: `Failed to validate API key: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Get quota status
   */
  async getQuotaStatus(userId?: string): Promise<ServiceResponse<QuotaStatus>> {
    try {
      const settingsResult = await this.getIntegrationSettings(userId);
      if (!settingsResult.success) {
        throw new Error('Failed to get integration settings');
      }

      const settings = settingsResult.data!;
      const usagePercentage = settings.api_quota_limit > 0 
        ? (settings.api_quota_used / settings.api_quota_limit) 
        : 0;

      const quotaStatus: QuotaStatus = {
        current_usage: settings.api_quota_used,
        quota_limit: settings.api_quota_limit,
        quota_remaining: Math.max(0, settings.api_quota_limit - settings.api_quota_used),
        usage_percentage: usagePercentage,
        reset_date: settings.quota_reset_date,
        is_approaching_limit: usagePercentage >= this.config.quotaWarningThreshold,
        is_quota_exceeded: usagePercentage >= 1.0
      };

      return {
        success: true,
        data: quotaStatus,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', 'Failed to get quota status:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to get quota status: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Check if quota allows for request
   */
  async checkQuotaAvailable(requestCount: number = 1, userId?: string): Promise<ServiceResponse<{
    allowed: boolean;
    remaining: number;
    reason?: string;
  }>> {
    try {
      const quotaResult = await this.getQuotaStatus(userId);
      if (!quotaResult.success) {
        throw new Error('Failed to get quota status');
      }

      const quota = quotaResult.data!;
      const allowed = quota.quota_remaining >= requestCount;
      
      return {
        success: true,
        data: {
          allowed,
          remaining: quota.quota_remaining,
          reason: allowed ? undefined : 'Quota exceeded'
        }
      };
    } catch (error) {
      this.log('error', 'Failed to check quota availability:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.QUOTA_EXCEEDED_ERROR,
          message: `Failed to check quota availability: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Generate usage report
   */
  async getUsageReport(
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    userId?: string
  ): Promise<ServiceResponse<UsageReport>> {
    try {
      const { startDate, endDate } = this.getReportPeriod(period);
      
      // Get usage logs for the period
      const { data: usageLogs, error } = await supabaseAdmin
        .from('indb_seranking_usage_logs')
        .select('*')
        .eq('integration_id', `${userId || 'system'}_seranking`)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        throw error;
      }

      const logs = usageLogs || [];
      
      // Calculate aggregated metrics
      const totalRequests = logs.reduce((sum, log) => sum + log.request_count, 0);
      const successfulRequests = logs.reduce((sum, log) => sum + log.successful_requests, 0);
      const failedRequests = logs.reduce((sum, log) => sum + log.failed_requests, 0);
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

      // Daily breakdown
      const dailyBreakdown = new Map<string, { requests: number; successful: number; failed: number; }>();
      logs.forEach(log => {
        const date = log.date;
        if (!dailyBreakdown.has(date)) {
          dailyBreakdown.set(date, { requests: 0, successful: 0, failed: 0 });
        }
        const day = dailyBreakdown.get(date)!;
        day.requests += log.request_count;
        day.successful += log.successful_requests;
        day.failed += log.failed_requests;
      });

      // Operation breakdown
      const operationBreakdown = new Map<string, { requests: number; successful: number; failed: number; totalResponseTime: number; count: number; }>();
      logs.forEach(log => {
        const operation = log.operation_type;
        if (!operationBreakdown.has(operation)) {
          operationBreakdown.set(operation, { requests: 0, successful: 0, failed: 0, totalResponseTime: 0, count: 0 });
        }
        const op = operationBreakdown.get(operation)!;
        op.requests += log.request_count;
        op.successful += log.successful_requests;
        op.failed += log.failed_requests;
        if (log.response_time_ms) {
          op.totalResponseTime += log.response_time_ms;
          op.count++;
        }
      });

      // Find peak usage day
      let peakUsageDay = '';
      let peakUsageCount = 0;
      dailyBreakdown.forEach((data, date) => {
        if (data.requests > peakUsageCount) {
          peakUsageCount = data.requests;
          peakUsageDay = date;
        }
      });

      // Get current quota status
      const quotaResult = await this.getQuotaStatus(userId);
      const quota = quotaResult.success ? quotaResult.data! : {
        current_usage: 0,
        quota_limit: this.config.defaultQuotaLimit,
        quota_remaining: this.config.defaultQuotaLimit,
        usage_percentage: 0
      } as QuotaStatus;

      const report: UsageReport = {
        period: {
          start: startDate,
          end: endDate,
          type: period
        },
        total_requests: totalRequests,
        successful_requests: successfulRequests,
        failed_requests: failedRequests,
        success_rate: Math.round(successRate * 100) / 100,
        quota_usage: {
          used: quota.current_usage,
          limit: quota.quota_limit,
          percentage: Math.round(quota.usage_percentage * 10000) / 100,
          remaining: quota.quota_remaining
        },
        daily_breakdown: Array.from(dailyBreakdown.entries()).map(([date, data]) => ({
          date,
          requests: data.requests,
          success_rate: data.requests > 0 ? Math.round((data.successful / data.requests) * 10000) / 100 : 0
        })),
        operation_breakdown: Object.fromEntries(
          Array.from(operationBreakdown.entries()).map(([operation, data]) => [
            operation,
            {
              requests: data.requests,
              success_rate: data.requests > 0 ? Math.round((data.successful / data.requests) * 10000) / 100 : 0,
              avg_response_time: data.count > 0 ? Math.round(data.totalResponseTime / data.count) : 0
            }
          ])
        ),
        peak_usage_day: peakUsageDay,
        peak_usage_count: peakUsageCount
      };

      return {
        success: true,
        data: report,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.log('error', 'Failed to generate usage report:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to generate usage report: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Enable quota alerts with thresholds
   */
  async enableQuotaAlerts(thresholds: number[], userId?: string): Promise<ServiceResponse<boolean>> {
    try {
      const quotaAlerts: QuotaAlert[] = thresholds.map(threshold => ({
        threshold,
        enabled: true
      }));

      const settingsResult = await this.updateIntegrationSettings({
        alert_settings: {
          quota_alerts: quotaAlerts,
          error_notifications: true,
          performance_alerts: true
        }
      }, userId);

      return settingsResult;
    } catch (error) {
      this.log('error', 'Failed to enable quota alerts:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to enable quota alerts: ${error}`,
          details: error
        }
      };
    }
  }

  /**
   * Get integration health status
   */
  async getIntegrationHealth(userId?: string): Promise<ServiceResponse<HealthCheckResult>> {
    try {
      // Return cached health check if recent (less than health check interval)
      if (this.lastHealthCheck && 
          (Date.now() - this.lastHealthCheck.last_check.getTime()) < (this.config.healthCheckInterval * 60 * 1000)) {
        return {
          success: true,
          data: this.lastHealthCheck,
          metadata: {
            source: 'cache',
            timestamp: new Date()
          }
        };
      }

      // Perform new health check
      return await this.testIntegration(userId);
    } catch (error) {
      this.log('error', 'Failed to get integration health:', error);
      return {
        success: false,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: `Failed to get integration health: ${error}`,
          details: error
        }
      };
    }
  }

  // Private helper methods

  private async checkQuotaThresholds(userId?: string): Promise<void> {
    try {
      const quotaResult = await this.getQuotaStatus(userId);
      if (!quotaResult.success) {
        return;
      }

      const quota = quotaResult.data!;
      const alertKey = `${userId || 'system'}_quota_alert`;
      
      // Check critical threshold
      if (quota.usage_percentage >= this.config.quotaCriticalThreshold) {
        if (!this.activeAlerts.has(`${alertKey}_critical`)) {
          this.log('error', `CRITICAL: Quota usage at ${Math.round(quota.usage_percentage * 100)}% for user: ${userId || 'system'}`);
          this.activeAlerts.set(`${alertKey}_critical`, new Date());
          // Here you would send critical alerts (email, SMS, etc.)
        }
      }
      
      // Check warning threshold
      else if (quota.usage_percentage >= this.config.quotaWarningThreshold) {
        if (!this.activeAlerts.has(`${alertKey}_warning`)) {
          this.log('warn', `WARNING: Quota usage at ${Math.round(quota.usage_percentage * 100)}% for user: ${userId || 'system'}`);
          this.activeAlerts.set(`${alertKey}_warning`, new Date());
          // Here you would send warning alerts
        }
      }
      
      // Clear alerts if usage drops below warning threshold
      else {
        this.activeAlerts.delete(`${alertKey}_warning`);
        this.activeAlerts.delete(`${alertKey}_critical`);
      }
    } catch (error) {
      this.log('error', 'Failed to check quota thresholds:', error);
    }
  }

  private async updateHealthStatus(result: HealthCheckResult, userId?: string): Promise<void> {
    try {
      await supabaseAdmin
        .from('indb_seranking_integrations')
        .update({
          last_health_check: result.last_check.toISOString(),
          health_status: result.status,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId || 'system')
        .eq('service_name', 'seranking');
    } catch (error) {
      this.log('warn', 'Failed to update health status:', error);
    }
  }

  private calculateNextResetDate(): Date {
    const now = new Date();
    if (this.config.defaultResetInterval === 'monthly') {
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }
  }

  private getReportPeriod(period: 'daily' | 'weekly' | 'monthly'): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }
    
    return { startDate, endDate };
  }

  private initializePeriodicTasks(): void {
    if (this.config.enableAutoQuotaReset) {
      // Check for quota resets every hour
      setInterval(async () => {
        try {
          await this.checkAutoQuotaReset();
        } catch (error) {
          this.log('error', 'Auto quota reset check failed:', error);
        }
      }, 60 * 60 * 1000); // 1 hour
    }

    // Health check interval
    if (this.config.healthCheckInterval > 0) {
      setInterval(async () => {
        try {
          await this.testIntegration();
        } catch (error) {
          this.log('error', 'Periodic health check failed:', error);
        }
      }, this.config.healthCheckInterval * 60 * 1000);
    }
  }

  private async checkAutoQuotaReset(): Promise<void> {
    try {
      const { data: integrations, error } = await supabaseAdmin
        .from('indb_seranking_integrations')
        .select('*')
        .eq('service_name', 'seranking');

      if (error || !integrations) {
        return;
      }

      const now = new Date();
      for (const integration of integrations) {
        const resetDate = new Date(integration.quota_reset_date);
        if (now >= resetDate) {
          await this.resetQuotaUsage(integration.user_id);
          this.log('info', `Auto-reset quota for user: ${integration.user_id}`);
        }
      }
    } catch (error) {
      this.log('error', 'Failed to check auto quota reset:', error);
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];
    
    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      console[level](`[IntegrationService ${timestamp}] ${message}`, ...args);
    }
  }
}