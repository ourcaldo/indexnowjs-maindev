/**
 * Rank Tracker Service
 * Core service for tracking keyword positions using IndexNow Rank Tracker API
 */

import { RankTrackerService } from './rank-tracker-service'
import { APIKeyManager } from './api-key-manager'
import { supabaseAdmin } from './supabase'
import { errorTracker, ErrorTracker } from './error-tracker'
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

interface RankResult {
  position: number | null
  url: string | null
  found: boolean
  totalResults: number
  errorMessage?: string
}

export class RankTracker {
  private rankTrackerService: RankTrackerService | null = null
  private apiKeyManager: APIKeyManager

  constructor() {
    this.apiKeyManager = new APIKeyManager()
  }

  /**
   * Track a single keyword and store the result
   */
  async trackKeyword(keywordData: KeywordToTrack): Promise<void> {
    try {
      logger.info(`Starting rank check for keyword: ${keywordData.keyword} (${keywordData.domain})`)

      // 1. Get site-level API key from database
      const apiKey = await this.apiKeyManager.getActiveAPIKey()
      if (!apiKey) {
        throw new Error('No active IndexNow Rank Tracker API integration found. Please contact admin to configure API integration.')
      }

      // 2. Check remaining quota (site-level) - need at least 10 quota per request
      const availableQuota = await this.apiKeyManager.getAvailableQuota()
      if (availableQuota < 10) {
        throw new Error(`Insufficient quota: ${availableQuota} remaining. Need 10 quota per request. Contact admin.`)
      }

      logger.info(`Site has ${availableQuota} API calls remaining`)

      // 3. Initialize IndexNow Rank Tracker service (loads API key from database)
      this.rankTrackerService = new RankTrackerService()

      // 4. Make rank check request
      const rankResult = await this.rankTrackerService.checkKeywordRank({
        keyword: keywordData.keyword,
        domain: keywordData.domain,
        country: keywordData.countryCode,
        deviceType: keywordData.deviceType
      })

      // 5. Handle API response with error logging
      if (!rankResult.errorMessage) {
        await this.apiKeyManager.updateQuotaUsage(apiKey)
        logger.info(`API quota consumed for successful request: keyword ${keywordData.keyword}`)
      } else {
        logger.warn(`API quota NOT consumed for failed request: ${rankResult.errorMessage}`)
        // Log API-level errors to error tracking system
        await this.logRankCheckError(keywordData, rankResult.errorMessage, 'api_error')
      }

      // 6. Store result in database (both success and failure)
      await this.storeRankResult(keywordData.id, rankResult)

      // 7. Update last check date
      await this.updateLastCheckDate(keywordData.id)

      logger.info(`Rank check completed for keyword ${keywordData.id}: Position ${rankResult.position || 'Not found'}`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Rank tracking failed for keyword ${keywordData.id}:`, error)
      
      // Log error to error tracking system with proper classification
      await this.logRankCheckError(keywordData, errorMessage, this.classifyError(errorMessage))
      
      // Store failed result in database
      await this.storeFailedResult(keywordData.id, errorMessage)
      throw error // Re-throw to let caller handle
    }
  }

  /**
   * Store successful rank result in database
   */
  private async storeRankResult(keywordId: string, result: RankResult): Promise<void> {
    try {
      // Get keyword details for device_type and country_id
      const { data: keyword, error: keywordError } = await supabaseAdmin
        .from('indb_keyword_keywords')
        .select('device_type, country_id')
        .eq('id', keywordId)
        .single()

      if (keywordError || !keyword) {
        throw new Error(`Failed to get keyword details: ${keywordError?.message}`)
      }

      // Insert into rank history
      const { error: historyError } = await supabaseAdmin
        .from('indb_keyword_rank_history')
        .insert({
          keyword_id: keywordId,
          position: result.position,
          url: result.url,
          search_volume: null, // IndexNow Rank Tracker doesn't provide search volume
          difficulty_score: null, // IndexNow Rank Tracker doesn't provide difficulty
          check_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          device_type: keyword.device_type,
          country_id: keyword.country_id,
          created_at: new Date().toISOString()
        })

      if (historyError) {
        logger.error('Error storing rank history:', historyError)
        throw new Error(`Failed to store rank history: ${historyError.message}`)
      }

      // Update or insert current ranking (for quick access on Overview page)
      const { error: rankingError } = await supabaseAdmin
        .from('indb_keyword_rankings')
        .upsert({
          keyword_id: keywordId,
          position: result.position,
          url: result.url,
          search_volume: null,
          difficulty_score: null,
          check_date: new Date().toISOString().split('T')[0]
        }, {
          onConflict: 'keyword_id'
        })

      if (rankingError) {
        logger.error('Error updating current ranking:', rankingError)
        throw new Error(`Failed to update current ranking: ${rankingError.message}`)
      }

      logger.info(`Successfully stored rank result for keyword ${keywordId}`)

    } catch (error) {
      logger.error('Error storing rank result:', error)
      throw error
    }
  }

  /**
   * Store failed rank check result
   */
  private async storeFailedResult(keywordId: string, errorMessage: string): Promise<void> {
    try {
      // Get keyword details
      const { data: keyword, error: keywordError } = await supabaseAdmin
        .from('indb_keyword_keywords')
        .select('device_type, country_id')
        .eq('id', keywordId)
        .single()

      if (keywordError || !keyword) {
        logger.error(`Failed to get keyword details for failed result: ${keywordError?.message}`)
        return
      }

      // Store failed result in history with null position
      const { error } = await supabaseAdmin
        .from('indb_keyword_rank_history')
        .insert({
          keyword_id: keywordId,
          position: null,
          url: null,
          search_volume: null,
          difficulty_score: null,
          check_date: new Date().toISOString().split('T')[0],
          device_type: keyword.device_type,
          country_id: keyword.country_id,
          created_at: new Date().toISOString()
        })

      if (error) {
        logger.error('Error storing failed result:', error)
      } else {
        logger.info(`Stored failed result for keyword ${keywordId}: ${errorMessage}`)
      }

    } catch (error) {
      logger.error('Error storing failed result:', error)
    }
  }

  /**
   * Update last check date for keyword
   */
  private async updateLastCheckDate(keywordId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('indb_keyword_keywords')
        .update({
          last_check_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', keywordId)

      if (error) {
        logger.error('Error updating last check date:', error)
      } else {
        logger.info(`Updated last check date for keyword ${keywordId}`)
      }

    } catch (error) {
      logger.error('Error updating last check date:', error)
    }
  }

  /**
   * Log rank check error to error tracking system
   */
  private async logRankCheckError(
    keywordData: KeywordToTrack, 
    errorMessage: string,
    errorType: 'quota_exceeded' | 'api_error' | 'parsing_error' | 'network_error' | 'authentication_error' = 'api_error'
  ): Promise<void> {
    try {
      await errorTracker.logError({
        keywordId: keywordData.id,
        userId: keywordData.userId,
        errorType,
        errorMessage,
        timestamp: new Date(),
        severity: ErrorTracker.determineSeverity(errorType, errorMessage),
        context: {
          keyword: keywordData.keyword,
          domain: keywordData.domain,
          deviceType: keywordData.deviceType,
          countryCode: keywordData.countryCode
        }
      })
    } catch (error) {
      logger.error('Failed to log rank check error:', error)
    }
  }

  /**
   * Classify error type based on error message
   */
  private classifyError(errorMessage: string): 'quota_exceeded' | 'api_error' | 'parsing_error' | 'network_error' | 'authentication_error' {
    const message = errorMessage.toLowerCase()
    
    if (message.includes('quota') || message.includes('limit exceeded') || message.includes('insufficient')) {
      return 'quota_exceeded'
    }
    
    if (message.includes('unauthorized') || message.includes('invalid api key') || message.includes('authentication')) {
      return 'authentication_error'
    }
    
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return 'network_error'
    }
    
    if (message.includes('parse') || message.includes('invalid response') || message.includes('unexpected format')) {
      return 'parsing_error'
    }
    
    return 'api_error' // Default classification
  }

  /**
   * Get keyword details with domain and country information
   */
  async getKeywordWithDetails(keywordId: string, userId: string): Promise<KeywordToTrack | null> {
    try {
      const { data: keyword, error } = await supabaseAdmin
        .from('indb_keyword_keywords')
        .select(`
          *,
          domain:indb_keyword_domains(domain_name),
          country:indb_keyword_countries(iso2_code)
        `)
        .eq('id', keywordId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error || !keyword) {
        logger.warn(`Keyword not found: ${keywordId} for user ${userId}`)
        return null
      }

      return {
        id: keyword.id,
        keyword: keyword.keyword,
        domain: keyword.domain.domain_name,
        deviceType: keyword.device_type,
        countryCode: keyword.country.iso2_code,
        userId: keyword.user_id
      }

    } catch (error) {
      logger.error('Error getting keyword details:', error)
      return null
    }
  }
}