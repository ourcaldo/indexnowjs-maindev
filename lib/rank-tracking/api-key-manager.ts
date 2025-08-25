/**
 * API Key Manager Service
 * Manages IndexNow Rank Tracker API integration and quota tracking
 */

import { supabaseAdmin } from '../database/supabase'
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
   * Automatically switches to next available key if current one is exhausted
   */
  async getActiveAPIKey(): Promise<string | null> {
    try {
      // First, try to get current active API key
      const { data: integration, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('service_name', 'custom_tracker')
        .eq('is_active', true)
        .single()

      if (error || !integration) {
        logger.warn('No active IndexNow Rank Tracker API integration found. Attempting to activate first available integration...')
        
        // Try to activate the first available API key
        const activated = await this.activateNextAvailableAPIKey()
        if (activated) {
          // Recursively call to get the newly activated key
          return await this.getActiveAPIKey()
        }
        
        logger.error('No IndexNow Rank Tracker API integration available at all')
        return null
      }

      // Check if current key has quota available
      const hasQuota = integration.api_quota_used < integration.api_quota_limit
      if (!hasQuota) {
        logger.warn(`Current API key exhausted (${integration.api_quota_used}/${integration.api_quota_limit}). Switching to next available key...`)
        
        // Deactivate current exhausted key
        await supabaseAdmin
          .from('indb_site_integration')
          .update({ is_active: false })
          .eq('id', integration.id)
        
        // Try to activate next available key
        const activated = await this.activateNextAvailableAPIKey()
        if (activated) {
          // Recursively call to get the newly activated key
          return await this.getActiveAPIKey()
        }
        
        logger.error('No alternative API keys with available quota found')
        return null
      }

      return integration.apikey

    } catch (error) {
      logger.error('Error getting active API key:', error)
      return null
    }
  }

  /**
   * Get available quota (site-level) - NO MORE DAILY RESET
   */
  async getAvailableQuota(): Promise<number> {
    try {
      const { data: integration, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('api_quota_limit, api_quota_used')
        .eq('service_name', 'custom_tracker')
        .eq('is_active', true)
        .single()

      if (error || !integration) {
        return 0
      }

      const available = integration.api_quota_limit - integration.api_quota_used
      // Check if we have at least 10 quota for the next request (each request consumes 10 credits)
      return Math.max(0, available)

    } catch (error) {
      logger.error('Error getting available quota:', error)
      return 0
    }
  }

  /**
   * Update quota usage after SUCCESSFUL API call (site-level) - consumes 10 quota per request
   * If quota will be exhausted, deactivates current API key and switches to next available one
   */
  async updateQuotaUsage(apiKey: string): Promise<void> {
    try {
      // First get current quota usage and limit for the specific API key
      const { data: currentData } = await supabaseAdmin
        .from('indb_site_integration')
        .select('id, api_quota_used, api_quota_limit')
        .eq('apikey', apiKey)
        .eq('is_active', true)
        .single()

      if (!currentData) {
        logger.error(`No active API key found matching: ${apiKey}`)
        return
      }

      // Consume 10 quota per successful request
      const newQuotaUsed = (currentData.api_quota_used || 0) + 10
      const quotaLimit = currentData.api_quota_limit || 0

      // Check if quota will be exhausted after this request
      const isQuotaExhausted = newQuotaUsed >= quotaLimit

      if (isQuotaExhausted) {
        logger.warn(`API key quota exhausted: ${newQuotaUsed}/${quotaLimit}. Deactivating API key.`)
        
        // Deactivate current API key
        await supabaseAdmin
          .from('indb_site_integration')
          .update({
            api_quota_used: newQuotaUsed,
            is_active: false, // Deactivate exhausted API key
            updated_at: new Date().toISOString()
          })
          .eq('id', currentData.id)

        logger.info(`API key deactivated. Attempting to activate next available key...`)
        
        // Try to activate next available API key
        const activated = await this.activateNextAvailableAPIKey()
        if (activated) {
          logger.info('Successfully switched to next available API key')
        } else {
          logger.error('No more API keys available. All quota exhausted.')
        }

      } else {
        // Normal quota update
        const { error } = await supabaseAdmin
          .from('indb_site_integration')
          .update({
            api_quota_used: newQuotaUsed,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentData.id)

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
   * REMOVED: Daily quota reset logic
   * IndexNow Rank Tracker quotas are TOTAL quotas until exhausted, not daily quotas
   * When quota hits limit, API integration becomes inactive and we switch to next available one
   */
  private async checkAndResetQuota(integration: any): Promise<void> {
    // No quota reset - quotas are total until exhausted
    // This method is kept for backward compatibility but does nothing
    return
  }

  /**
   * Activate next available API key when current one is exhausted
   * Fixed to properly find keys with available quota (no more daily reset logic)
   */
  private async activateNextAvailableAPIKey(): Promise<boolean> {
    try {
      // Find next available IndexNow Rank Tracker API integration that is inactive but has quota remaining
      const { data: availableKeys, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('*')
        .eq('service_name', 'custom_tracker')
        .eq('is_active', false)
        .order('created_at', { ascending: true })

      if (error || !availableKeys || availableKeys.length === 0) {
        logger.error('No alternative API integrations available. All Custom Tracker API quota exhausted.')
        return false
      }

      // Find the first key with available quota (no quota reset, just check current quota)
      for (const key of availableKeys) {
        const availableQuota = key.api_quota_limit - key.api_quota_used
        
        if (availableQuota >= 10) { // Need at least 10 credits for next request
          // Activate this API key
          const { error: activateError } = await supabaseAdmin
            .from('indb_site_integration')
            .update({
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', key.id)

          if (!activateError) {
            logger.info(`Successfully activated alternative API key with ${availableQuota} quota remaining`)
            return true
          } else {
            logger.error('Error activating alternative API key:', activateError)
          }
        } else {
          logger.info(`Skipping API key with insufficient quota: ${availableQuota}/10 required`)
        }
      }

      logger.error('No API integrations with available quota found. All Custom Tracker API quota exhausted.')
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
        .eq('service_name', 'custom_tracker')
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
        .eq('service_name', 'custom_tracker')
        .eq('is_active', true)
        .single()

      if (!freshIntegration) return null

      return {
        apiKey: freshIntegration.apikey,
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
        .eq('service_name', 'custom_tracker')

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