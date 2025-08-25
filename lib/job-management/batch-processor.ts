/**
 * Batch Processor Service
 * Handles daily rank checks for multiple keywords in batches
 */

import { RankTracker } from '../rank-tracking/rank-tracker'
import { APIKeyManager } from '../rank-tracking/api-key-manager'
import { supabaseAdmin } from '../database/supabase'

// Simple console logger for development
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
}

interface KeywordToTrack {
  id: string
  keyword: string
  domain: string
  deviceType: 'desktop' | 'mobile'
  countryCode: string
  userId: string
}

export class BatchProcessor {
  private rankTracker: RankTracker
  private apiKeyManager: APIKeyManager
  private batchSize: number = 5 // Process 5 keywords at once
  private delayBetweenRequests: number = 2000 // 2 second delay
  private delayBetweenUsers: number = 5000 // 5 second delay between users

  constructor() {
    this.rankTracker = new RankTracker()
    this.apiKeyManager = new APIKeyManager()
  }

  /**
   * Process daily rank checks for all active keywords
   */
  async processDailyRankChecks(): Promise<void> {
    try {
      logger.info('Starting daily rank check process...')

      // 1. Get all keywords that need checking today
      const keywords = await this.getKeywordsToTrack()
      logger.info(`Found ${keywords.length} keywords to track`)

      if (keywords.length === 0) {
        logger.info('No keywords need checking today')
        return
      }

      // 2. Group by user to manage quotas
      const keywordsByUser = this.groupKeywordsByUser(keywords)
      logger.info(`Processing keywords for ${keywordsByUser.size} users`)

      // 3. Process each user's keywords in batches
      let totalProcessed = 0
      let totalErrors = 0

      for (const [userId, userKeywords] of Array.from(keywordsByUser.entries())) {
        try {
          const result = await this.processUserKeywords(userId, userKeywords)
          totalProcessed += result.processed
          totalErrors += result.errors
          
          // Delay between users to avoid overwhelming API
          if (keywordsByUser.size > 1) {
            await this.delay(this.delayBetweenUsers)
          }
        } catch (error) {
          logger.error(`Failed to process keywords for user ${userId}:`, error)
          totalErrors += userKeywords.length
        }
      }

      logger.info(`Daily rank check completed: ${totalProcessed} processed, ${totalErrors} errors`)

    } catch (error) {
      logger.error('Daily rank check batch failed:', error)
      throw error
    }
  }

  /**
   * Get keywords that need daily rank checking
   */
  private async getKeywordsToTrack(): Promise<KeywordToTrack[]> {
    try {
      const { data: keywords, error } = await supabaseAdmin
        .from('indb_keyword_keywords')
        .select(`
          id,
          keyword,
          device_type,
          user_id,
          last_check_date,
          domain:indb_keyword_domains(domain_name),
          country:indb_keyword_countries(iso2_code)
        `)
        .eq('is_active', true)
        .or('last_check_date.is.null,last_check_date.neq.' + new Date().toISOString().split('T')[0])
        .order('user_id')
        .order('created_at')

      if (error) {
        logger.error('Error fetching keywords to track:', error)
        return []
      }

      return (keywords || []).map((k: any) => ({
        id: k.id,
        keyword: k.keyword,
        domain: k.domain.domain_name,
        deviceType: k.device_type,
        countryCode: k.country.iso2_code,
        userId: k.user_id
      }))

    } catch (error) {
      logger.error('Error getting keywords to track:', error)
      return []
    }
  }

  /**
   * Group keywords by user ID
   */
  private groupKeywordsByUser(keywords: KeywordToTrack[]): Map<string, KeywordToTrack[]> {
    const grouped = new Map<string, KeywordToTrack[]>()
    
    for (const keyword of keywords) {
      const existing = grouped.get(keyword.userId) || []
      existing.push(keyword)
      grouped.set(keyword.userId, existing)
    }
    
    return grouped
  }

  /**
   * Process keywords for a specific user
   */
  private async processUserKeywords(userId: string, keywords: KeywordToTrack[]): Promise<{ processed: number, errors: number }> {
    logger.info(`Processing ${keywords.length} keywords for user ${userId}`)

    // Check user's available quota first
    const availableQuota = await this.apiKeyManager.getAvailableQuota()
    const keywordsToProcess = keywords.slice(0, availableQuota)

    if (keywordsToProcess.length < keywords.length) {
      logger.warn(`User ${userId}: Processing ${keywordsToProcess.length}/${keywords.length} keywords (quota limit: ${availableQuota})`)
    }

    if (keywordsToProcess.length === 0) {
      logger.warn(`User ${userId}: No quota available, skipping all keywords`)
      return { processed: 0, errors: 0 }
    }

    // Process in batches
    let processed = 0
    let errors = 0

    for (let i = 0; i < keywordsToProcess.length; i += this.batchSize) {
      const batch = keywordsToProcess.slice(i, i + this.batchSize)
      logger.info(`Processing batch ${Math.floor(i / this.batchSize) + 1} for user ${userId} (${batch.length} keywords)`)

      // Process batch in parallel (but rate limited)
      const batchResults = await Promise.allSettled(
        batch.map(keyword => this.rankTracker.trackKeyword(keyword))
      )

      // Count results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          processed++
        } else {
          errors++
          logger.error('Keyword tracking failed in batch:', result.reason)
        }
      }

      // Delay between batches (except for last batch)
      if (i + this.batchSize < keywordsToProcess.length) {
        await this.delay(this.delayBetweenRequests)
      }
    }

    logger.info(`Completed processing for user ${userId}: ${processed} successful, ${errors} errors`)
    return { processed, errors }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get batch processing statistics
   */
  async getProcessingStats(): Promise<any> {
    try {
      // Get keywords needing check
      const { count: pendingCount } = await supabaseAdmin
        .from('indb_keyword_keywords')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .or('last_check_date.is.null,last_check_date.neq.' + new Date().toISOString().split('T')[0])

      // Get total active keywords
      const { count: totalCount } = await supabaseAdmin
        .from('indb_keyword_keywords')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)

      // Get recent rank history count (today)
      const { count: checkedTodayCount } = await supabaseAdmin
        .from('indb_keyword_rank_history')
        .select('id', { count: 'exact', head: true })
        .eq('check_date', new Date().toISOString().split('T')[0])

      return {
        totalKeywords: totalCount || 0,
        pendingChecks: pendingCount || 0,
        checkedToday: checkedTodayCount || 0,
        completionRate: totalCount ? ((checkedTodayCount || 0) / totalCount * 100).toFixed(1) : 0
      }

    } catch (error) {
      logger.error('Error getting processing stats:', error)
      return {
        totalKeywords: 0,
        pendingChecks: 0,
        checkedToday: 0,
        completionRate: 0
      }
    }
  }
}