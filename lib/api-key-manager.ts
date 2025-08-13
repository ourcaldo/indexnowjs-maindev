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
   * Get active API key for user
   */
  async getActiveAPIKey(userId: string): Promise<string | null> {
    try {
      const { data: integration, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('user_id', userId)
        .eq('service_name', 'scrapingdog')
        .eq('is_active', true)
        .single()

      if (error || !integration) {
        logger.warn(`No active ScrapingDog API key found for user ${userId}`)
        return null
      }

      // Check if quota reset is needed
      await this.checkAndResetQuota(userId, integration)

      return integration.scrappingdog_apikey

    } catch (error) {
      logger.error('Error getting active API key:', error)
      return null
    }
  }

  /**
   * Get available quota for user
   */
  async getAvailableQuota(userId: string): Promise<number> {
    try {
      const { data: integration, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('api_quota_limit, api_quota_used, quota_reset_date')
        .eq('user_id', userId)
        .eq('service_name', 'scrapingdog')
        .eq('is_active', true)
        .single()

      if (error || !integration) {
        return 0
      }

      // Check if quota reset is needed
      await this.checkAndResetQuota(userId, integration)

      // Refresh data after potential reset
      const { data: updatedIntegration } = await supabaseAdmin
        .from('indb_site_integration')
        .select('api_quota_limit, api_quota_used')
        .eq('user_id', userId)
        .eq('service_name', 'scrapingdog')
        .eq('is_active', true)
        .single()

      if (!updatedIntegration) return 0

      const available = updatedIntegration.api_quota_limit - updatedIntegration.api_quota_used
      return Math.max(0, available)

    } catch (error) {
      logger.error('Error getting available quota:', error)
      return 0
    }
  }

  /**
   * Update quota usage after API call
   */
  async updateQuotaUsage(userId: string, apiKey: string): Promise<void> {
    try {
      // First get current quota usage
      const { data: currentData } = await supabaseAdmin
        .from('indb_site_integration')
        .select('api_quota_used')
        .eq('user_id', userId)
        .eq('scrappingdog_apikey', apiKey)
        .single()

      const newQuotaUsed = (currentData?.api_quota_used || 0) + 1

      const { error } = await supabaseAdmin
        .from('indb_site_integration')
        .update({
          api_quota_used: newQuotaUsed,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('scrappingdog_apikey', apiKey)

      if (error) {
        logger.error('Error updating quota usage:', error)
      } else {
        logger.info(`Updated quota usage for user ${userId}`)
      }

    } catch (error) {
      logger.error('Error updating quota usage:', error)
    }
  }

  /**
   * Check if quota needs to be reset (daily reset)
   */
  private async checkAndResetQuota(userId: string, integration: any): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const quotaResetDate = integration.quota_reset_date

      if (quotaResetDate !== today) {
        logger.info(`Resetting quota for user ${userId} (last reset: ${quotaResetDate}, today: ${today})`)
        
        const { error } = await supabaseAdmin
          .from('indb_site_integration')
          .update({
            api_quota_used: 0,
            quota_reset_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('service_name', 'scrapingdog')

        if (error) {
          logger.error('Error resetting quota:', error)
        } else {
          logger.info(`Quota reset successful for user ${userId}`)
        }
      }

    } catch (error) {
      logger.error('Error checking quota reset:', error)
    }
  }

  /**
   * Get API key information with quota details
   */
  async getAPIKeyInfo(userId: string): Promise<APIKeyInfo | null> {
    try {
      const { data: integration, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('user_id', userId)
        .eq('service_name', 'scrapingdog')
        .eq('is_active', true)
        .single()

      if (error || !integration) {
        return null
      }

      // Check and reset quota if needed
      await this.checkAndResetQuota(userId, integration)

      // Get fresh data after potential reset
      const { data: freshIntegration } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('user_id', userId)
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