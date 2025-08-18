/**
 * Keyword Usage Tracker Service
 * Manages user keyword quota tracking and enforcement
 */

import { supabaseAdmin } from './supabase'

// Simple console logger for development
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
}

interface KeywordUsageInfo {
  keywords_used: number
  keywords_limit: number
  period_start: string
  period_end: string
  remaining_quota: number
}

export class KeywordUsageTracker {
  
  /**
   * Get current month's keyword usage for user
   */
  async getCurrentUsage(userId: string): Promise<KeywordUsageInfo | null> {
    try {
      // Get current month start and end
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      const { data: usage, error } = await supabaseAdmin
        .from('indb_keyword_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('period_start', currentMonthStart.toISOString().split('T')[0])
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        logger.error(`Error fetching keyword usage for user ${userId}:`, error)
        return null
      }

      if (!usage) {
        // No usage record exists for current month - return zero usage
        return {
          keywords_used: 0,
          keywords_limit: await this.getUserKeywordLimit(userId),
          period_start: currentMonthStart.toISOString(),
          period_end: currentMonthEnd.toISOString(),
          remaining_quota: await this.getUserKeywordLimit(userId)
        }
      }

      return {
        keywords_used: usage.keywords_used,
        keywords_limit: usage.keywords_limit,
        period_start: usage.period_start,
        period_end: usage.period_end,
        remaining_quota: Math.max(0, usage.keywords_limit - usage.keywords_used)
      }

    } catch (error) {
      logger.error('Error getting current keyword usage:', error)
      return null
    }
  }

  /**
   * Track keyword usage when keywords are added
   */
  async trackKeywordUsage(userId: string, keywordsAdded: number): Promise<boolean> {
    try {
      logger.info(`Tracking keyword usage: User ${userId}, Adding ${keywordsAdded} keywords`)

      // Get current month boundaries
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      
      const periodStartStr = currentMonthStart.toISOString().split('T')[0]
      const periodEndStr = currentMonthEnd.toISOString()

      // Get user's keyword limit
      const keywordLimit = await this.getUserKeywordLimit(userId)

      // Check if usage record exists for current month
      const { data: existingUsage, error: fetchError } = await supabaseAdmin
        .from('indb_keyword_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('period_start', periodStartStr)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        logger.error('Error fetching existing usage record:', fetchError)
        return false
      }

      if (existingUsage) {
        // Update existing record
        const newUsageCount = existingUsage.keywords_used + keywordsAdded
        
        const { error: updateError } = await supabaseAdmin
          .from('indb_keyword_usage')
          .update({
            keywords_used: newUsageCount,
            keywords_limit: keywordLimit, // Update limit in case user's plan changed
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUsage.id)

        if (updateError) {
          logger.error('Error updating keyword usage:', updateError)
          return false
        }

        logger.info(`Updated keyword usage: ${existingUsage.keywords_used} + ${keywordsAdded} = ${newUsageCount}`)
      } else {
        // Create new record for current month
        const { error: insertError } = await supabaseAdmin
          .from('indb_keyword_usage')
          .insert({
            user_id: userId,
            keywords_used: keywordsAdded,
            keywords_limit: keywordLimit,
            period_start: periodStartStr,
            period_end: periodEndStr,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          logger.error('Error creating keyword usage record:', insertError)
          return false
        }

        logger.info(`Created new keyword usage record: ${keywordsAdded} keywords used`)
      }

      return true

    } catch (error) {
      logger.error('Error tracking keyword usage:', error)
      return false
    }
  }

  /**
   * Remove keyword usage when keywords are deleted
   */
  async removeKeywordUsage(userId: string, keywordsRemoved: number): Promise<boolean> {
    try {
      logger.info(`Removing keyword usage: User ${userId}, Removing ${keywordsRemoved} keywords`)

      // Get current month start
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodStartStr = currentMonthStart.toISOString().split('T')[0]

      // Get existing usage record
      const { data: existingUsage, error: fetchError } = await supabaseAdmin
        .from('indb_keyword_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('period_start', periodStartStr)
        .single()

      if (fetchError) {
        logger.warn('No existing usage record found to remove from')
        return true // Not an error - nothing to remove
      }

      // Update usage count (ensure it doesn't go below 0)
      const newUsageCount = Math.max(0, existingUsage.keywords_used - keywordsRemoved)
      
      const { error: updateError } = await supabaseAdmin
        .from('indb_keyword_usage')
        .update({
          keywords_used: newUsageCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUsage.id)

      if (updateError) {
        logger.error('Error removing keyword usage:', updateError)
        return false
      }

      logger.info(`Removed keyword usage: ${existingUsage.keywords_used} - ${keywordsRemoved} = ${newUsageCount}`)
      return true

    } catch (error) {
      logger.error('Error removing keyword usage:', error)
      return false
    }
  }

  /**
   * Check if user can add more keywords (quota validation)
   */
  async canAddKeywords(userId: string, keywordsToAdd: number): Promise<{ canAdd: boolean, reason?: string, currentUsage?: KeywordUsageInfo }> {
    try {
      const currentUsage = await this.getCurrentUsage(userId)
      
      if (!currentUsage) {
        return { canAdd: false, reason: 'Unable to check keyword quota' }
      }

      // Check if unlimited keywords (-1)
      if (currentUsage.keywords_limit === -1) {
        return { canAdd: true, currentUsage }
      }

      // Check if adding keywords would exceed limit
      if (currentUsage.keywords_used + keywordsToAdd > currentUsage.keywords_limit) {
        return { 
          canAdd: false, 
          reason: `Adding ${keywordsToAdd} keywords would exceed your monthly limit of ${currentUsage.keywords_limit}. Current usage: ${currentUsage.keywords_used}`,
          currentUsage 
        }
      }

      return { canAdd: true, currentUsage }

    } catch (error) {
      logger.error('Error checking keyword quota:', error)
      return { canAdd: false, reason: 'Error checking keyword quota' }
    }
  }

  /**
   * Get user's keyword limit from their package/subscription
   */
  private async getUserKeywordLimit(userId: string): Promise<number> {
    try {
      // Get user profile with package information
      const { data: userProfile } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select(`
          package_id,
          package:indb_payment_packages(quota_limits)
        `)
        .eq('user_id', userId)
        .single()

      // First check direct package assignment
      if (userProfile?.package_id && userProfile?.package) {
        const packageData = userProfile.package as any
        const quotaLimits = packageData?.quota_limits as any
        return quotaLimits?.keywords_limit || 50 // Default to 50 if not specified
      }

      // Check active subscription
      const { data: activeSubscriptions } = await supabaseAdmin
        .from('indb_payment_subscriptions')
        .select(`
          package:indb_payment_packages(quota_limits)
        `)
        .eq('user_id', userId)
        .eq('subscription_status', 'active')

      if (activeSubscriptions && activeSubscriptions.length > 0) {
        const firstSubscription = activeSubscriptions[0] as any
        const quotaLimits = firstSubscription?.package?.quota_limits as any
        return quotaLimits?.keywords_limit || 50
      }

      // Default free tier limit
      return 50

    } catch (error) {
      logger.error('Error getting user keyword limit:', error)
      return 50 // Safe default
    }
  }

  /**
   * Get keyword usage statistics for multiple users (admin function)
   */
  async getUsersUsageStats(userIds?: string[]): Promise<Array<{ user_id: string, keywords_used: number, keywords_limit: number, percentage_used: number }>> {
    try {
      let query = supabaseAdmin
        .from('indb_keyword_usage')
        .select('user_id, keywords_used, keywords_limit')
        
      if (userIds && userIds.length > 0) {
        query = query.in('user_id', userIds)
      }

      // Get current month only
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodStartStr = currentMonthStart.toISOString().split('T')[0]
      
      query = query.eq('period_start', periodStartStr)

      const { data: usageStats, error } = await query

      if (error) {
        logger.error('Error fetching users usage stats:', error)
        return []
      }

      return (usageStats || []).map(stat => ({
        user_id: stat.user_id,
        keywords_used: stat.keywords_used,
        keywords_limit: stat.keywords_limit,
        percentage_used: stat.keywords_limit > 0 ? Math.round((stat.keywords_used / stat.keywords_limit) * 100) : 0
      }))

    } catch (error) {
      logger.error('Error getting users usage stats:', error)
      return []
    }
  }
}

// Export singleton instance
export const keywordUsageTracker = new KeywordUsageTracker()