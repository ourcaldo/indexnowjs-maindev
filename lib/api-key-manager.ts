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
      // Check if we have at least 10 quota for the next request
      return Math.max(0, available)

    } catch (error) {
      logger.error('Error getting available quota:', error)
      return 0
    }
  }

  /**
   * Update quota usage after API call (site-level) - consumes 10 quota per request
   * If quota is exhausted, deactivates current API key and switches to next available one
   */
  async updateQuotaUsage(apiKey: string): Promise<void> {
    try {
      // First get current quota usage and limit
      const { data: currentData } = await supabaseAdmin
        .from('indb_site_integration')
        .select('api_quota_used, api_quota_limit')
        .eq('scrappingdog_apikey', apiKey)
        .eq('is_active', true)
        .single()

      // Consume 10 quota per successful request
      const newQuotaUsed = (currentData?.api_quota_used || 0) + 10
      const quotaLimit = currentData?.api_quota_limit || 0

      // Check if quota is exhausted after this request
      const isQuotaExhausted = newQuotaUsed >= quotaLimit

      if (isQuotaExhausted) {
        logger.warn(`API key quota exhausted: ${newQuotaUsed}/${quotaLimit}. Deactivating API key and switching to next available.`)
        
        // Deactivate current API key
        await supabaseAdmin
          .from('indb_site_integration')
          .update({
            api_quota_used: newQuotaUsed,
            is_active: false, // Deactivate exhausted API key
            updated_at: new Date().toISOString()
          })
          .eq('scrappingdog_apikey', apiKey)

        // Try to activate next available API key
        await this.activateNextAvailableAPIKey()

      } else {
        // Normal quota update
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
          logger.info(`Updated site-level quota usage: +10 (Total: ${newQuotaUsed}/${quotaLimit})`)
        }
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
   * Activate next available API key when current one is exhausted
   */
  private async activateNextAvailableAPIKey(): Promise<boolean> {
    try {
      // Find next available ScrapingDog API key that is inactive but has quota remaining
      const { data: availableKeys, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('service_name', 'scrapingdog')
        .eq('is_active', false)
        .order('created_at', { ascending: true })

      if (error || !availableKeys || availableKeys.length === 0) {
        logger.error('No alternative API keys available. All ScrapingDog API keys exhausted.')
        return false
      }

      // Find the first key with available quota
      for (const key of availableKeys) {
        await this.checkAndResetQuota(key)
        
        // Refresh key data after potential quota reset
        const { data: refreshedKey } = await supabaseAdmin
          .from('indb_site_integration')
          .select('*')
          .eq('id', key.id)
          .single()

        if (refreshedKey && refreshedKey.api_quota_used < refreshedKey.api_quota_limit) {
          // Activate this API key
          const { error: activateError } = await supabaseAdmin
            .from('indb_site_integration')
            .update({
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', refreshedKey.id)

          if (!activateError) {
            logger.info(`Successfully activated alternative API key with ${refreshedKey.api_quota_limit - refreshedKey.api_quota_used} quota remaining`)
            return true
          } else {
            logger.error('Error activating alternative API key:', activateError)
          }
        }
      }

      logger.error('No API keys with available quota found. All ScrapingDog API keys exhausted.')
      return false

    } catch (error) {
      logger.error('Error activating next available API key:', error)
      return false
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

  /**
   * Get total number of available API keys and quota status
   */
  async getAPIKeysSummary(): Promise<{
    totalKeys: number
    activeKeys: number
    totalQuota: number
    usedQuota: number
    availableQuota: number
  }> {
    try {
      const { data: allKeys, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('service_name', 'scrapingdog')

      if (error || !allKeys) {
        return { totalKeys: 0, activeKeys: 0, totalQuota: 0, usedQuota: 0, availableQuota: 0 }
      }

      const totalKeys = allKeys.length
      const activeKeys = allKeys.filter(key => key.is_active).length
      const totalQuota = allKeys.reduce((sum, key) => sum + (key.api_quota_limit || 0), 0)
      const usedQuota = allKeys.reduce((sum, key) => sum + (key.api_quota_used || 0), 0)
      const availableQuota = totalQuota - usedQuota

      return {
        totalKeys,
        activeKeys,
        totalQuota,
        usedQuota,
        availableQuota
      }

    } catch (error) {
      logger.error('Error getting API keys summary:', error)
      return { totalKeys: 0, activeKeys: 0, totalQuota: 0, usedQuota: 0, availableQuota: 0 }
    }
  }
}