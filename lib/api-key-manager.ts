/**
 * API Key Manager Service
 * Manages ScrapingDog API keys and quota tracking
 */

import { supabaseAdmin } from './supabase'
// Simple console logger for development
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
}

interface APIKeyInfo {
  apiKey: string
  quotaUsed: number
  quotaLimit: number
  quotaResetDate: string
}

export class APIKeyManager {
  /**
   * Get active API key (site-level configuration)
   */
  async getActiveAPIKey(): Promise<string | null> {
    try {
      const { data: integration, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('service_name', 'scrapingdog')
        .eq('is_active', true)
        .single()

      if (error || !integration) {
        logger.warn('No active ScrapingDog API key found at site level')
        return null
      }

      // Check if quota reset is needed
      await this.checkAndResetQuota(integration)

      return integration.scrappingdog_apikey

    } catch (error) {
      logger.error('Error getting active API key:', error)
      return null
    }
  }

  /**
   * Get available quota (site-level)
   */
  async getAvailableQuota(): Promise<number> {
    try {
      const { data: integration, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('api_quota_limit, api_quota_used, quota_reset_date')
        .eq('service_name', 'scrapingdog')
        .eq('is_active', true)
        .single()

      if (error || !integration) {
        return 0
      }

      // Check if quota reset is needed
      await this.checkAndResetQuota(integration)

      // Refresh data after potential reset
      const { data: updatedIntegration } = await supabaseAdmin
        .from('indb_site_integration')
        .select('api_quota_limit, api_quota_used')
        .eq('service_name', 'scrapingdog')
        .eq('is_active', true)
        .single()

      if (!updatedIntegration) return 0

      const available = updatedIntegration.api_quota_limit - updatedIntegration.api_quota_used
      // Check if we have at least 100 quota for the next request
      return Math.max(0, available)

    } catch (error) {
      logger.error('Error getting available quota:', error)
      return 0
    }
  }

  /**
   * Update quota usage after API call (site-level) - consumes 100 quota per request
   */
  async updateQuotaUsage(apiKey: string): Promise<void> {
    try {
      // First get current quota usage
      const { data: currentData } = await supabaseAdmin
        .from('indb_site_integration')
        .select('api_quota_used')
        .eq('scrappingdog_apikey', apiKey)
        .eq('is_active', true)
        .single()

      // Consume 100 quota per successful request
      const newQuotaUsed = (currentData?.api_quota_used || 0) + 100

      const { error } = await supabaseAdmin
        .from('indb_site_integration')
        .update({
          api_quota_used: newQuotaUsed,
          updated_at: new Date().toISOString()
        })
        .eq('scrappingdog_apikey', apiKey)
        .eq('is_active', true)

      if (error) {
        logger.error('Error updating quota usage:', error)
      } else {
        logger.info(`Updated site-level quota usage: +100 (Total: ${newQuotaUsed})`)
      }

    } catch (error) {
      logger.error('Error updating quota usage:', error)
    }
  }

  /**
   * Check if quota needs to be reset (daily reset) - site level
   */
  private async checkAndResetQuota(integration: any): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const quotaResetDate = integration.quota_reset_date

      if (quotaResetDate !== today) {
        logger.info(`Resetting site-level quota (last reset: ${quotaResetDate}, today: ${today})`)
        
        const { error } = await supabaseAdmin
          .from('indb_site_integration')
          .update({
            api_quota_used: 0,
            quota_reset_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('service_name', 'scrapingdog')
          .eq('is_active', true)

        if (error) {
          logger.error('Error resetting quota:', error)
        } else {
          logger.info('Site-level quota reset successful')
        }
      }

    } catch (error) {
      logger.error('Error checking quota reset:', error)
    }
  }

  /**
   * Get API key information with quota details (site-level)
   */
  async getAPIKeyInfo(): Promise<APIKeyInfo | null> {
    try {
      const { data: integration, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('service_name', 'scrapingdog')
        .eq('is_active', true)
        .single()

      if (error || !integration) {
        return null
      }

      // Check and reset quota if needed
      await this.checkAndResetQuota(integration)

      // Get fresh data after potential reset
      const { data: freshIntegration } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('service_name', 'scrapingdog')
        .eq('is_active', true)
        .single()

      if (!freshIntegration) return null

      return {
        apiKey: freshIntegration.scrappingdog_apikey,
        quotaUsed: freshIntegration.api_quota_used,
        quotaLimit: freshIntegration.api_quota_limit,
        quotaResetDate: freshIntegration.quota_reset_date
      }

    } catch (error) {
      logger.error('Error getting API key info:', error)
      return null
    }
  }
}