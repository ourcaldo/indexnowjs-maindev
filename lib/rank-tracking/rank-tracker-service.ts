/**
 * IndexNow Rank Tracker API Integration Service
 * Handles rank checking via custom backend API at http://160.79.119.44:5000
 */

import { supabaseAdmin } from '../database/supabase'

// Simple console logger for development
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
}

interface RankTrackerConfig {
  apiKey: string
  baseUrl: string
}

interface RankCheckRequest {
  keyword: string
  domain: string
  country: string // ISO2 code
  deviceType: 'desktop' | 'mobile'
}

interface RankCheckResponse {
  position: number | null
  url: string | null
  found: boolean
  totalResults: number
  errorMessage?: string
}

interface CustomApiResponse {
  keyword: string
  domain: string
  device: 'desktop' | 'mobile'
  country: string
  rank: number | null
  url: string | null
  error: string | null
  attempts: number
  execution_time: number
}

export class RankTrackerService {
  private config: RankTrackerConfig | null = null

  /**
   * Initialize service with API key from database
   */
  private async initialize(): Promise<void> {
    if (this.config) return // Already initialized

    try {
      // Get API key from database
      const { data: integration, error } = await supabaseAdmin
        .from('indb_site_integration')
        .select('apikey')
        .eq('service_name', 'custom_tracker')
        .eq('is_active', true)
        .single()

      if (error || !integration?.apikey) {
        throw new Error('No active Custom Tracker API integration found in database')
      }

      this.config = {
        apiKey: integration.apikey,
        baseUrl: 'http://160.79.119.44:5000'
      }

      logger.info('IndexNow Rank Tracker service initialized with database API key')

    } catch (error) {
      logger.error('Failed to initialize Rank Tracker service:', error)
      throw error
    }
  }

  /**
   * Check keyword ranking position for a specific domain
   */
  async checkKeywordRank(request: RankCheckRequest): Promise<RankCheckResponse> {
    try {
      // Initialize service if not already done
      await this.initialize()
      
      if (!this.config) {
        throw new Error('Rank Tracker service not properly initialized')
      }

      logger.info(`IndexNow Rank Tracker: Checking rank for keyword "${request.keyword}" domain "${request.domain}"`)

      // Build API request body for custom backend
      const requestBody = {
        keyword: request.keyword,
        domain: request.domain,
        devices: request.deviceType, // "desktop" or "mobile"
        country: request.country.toUpperCase(), // Ensure uppercase country code (ID, US, etc.)
        max_pages: 50,
        headless: true,
        max_retries: 3,
        use_proxy: true,
        max_processing_time: 120
      }

      // Make API request
      const response = await this.makeRequest(requestBody)
      
      if (response.error) {
        throw new Error(response.error || 'Unknown API error')
      }

      // Process response - custom backend returns rank directly
      return this.processResponse(response)

    } catch (error) {
      logger.error('IndexNow Rank Tracker rank check failed:', error)
      return {
        position: null,
        url: null,
        found: false,
        totalResults: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Process Custom Tracker API response to extract domain ranking
   */
  private processResponse(response: CustomApiResponse): RankCheckResponse {
    logger.info(`IndexNow Rank Tracker: Processing response for keyword "${response.keyword}"`)

    if (response.rank && response.rank > 0) {
      logger.info(`IndexNow Rank Tracker: Found domain at position ${response.rank}`)
      return {
        position: response.rank,
        url: response.url,
        found: true,
        totalResults: 50 // Assuming max_pages: 50 means 50*10 = 500 results checked
      }
    } else {
      logger.info(`IndexNow Rank Tracker: Domain not found in search results`)
      return {
        position: null,
        url: null,
        found: false,
        totalResults: 50
      }
    }
  }

  /**
   * Extract clean domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      return urlObj.hostname.toLowerCase().replace(/^www\./, '')
    } catch (error) {
      // If URL parsing fails, try to extract domain manually
      const cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      return cleanUrl.toLowerCase()
    }
  }

  /**
   * Make HTTP request to Custom Tracker API with error handling and retries
   */
  private async makeRequest(requestBody: any): Promise<CustomApiResponse> {
    if (!this.config) {
      throw new Error('Service not initialized')
    }

    const url = `${this.config.baseUrl}/track-keyword`

    logger.info(`IndexNow Rank Tracker: Making request to ${url} for keyword "${requestBody.keyword}"`)

    // Retry logic
    let lastError: Error | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.info(`IndexNow Rank Tracker: Sending request with headers: X-API-Key: ***masked***, Host: localhost`)
        logger.info(`IndexNow Rank Tracker: Request body: ${JSON.stringify(requestBody)}`)
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'X-API-Key': this.config.apiKey,
            'Host': 'localhost',
            'Content-Type': 'application/json',
            'User-Agent': 'IndexNow-Studio-Rank-Tracker/1.0'
          },
          body: JSON.stringify(requestBody),
          timeout: 150000 // 150 second timeout (longer than max_processing_time)
        } as any)

        logger.info(`IndexNow Rank Tracker: Response status: ${response.status} ${response.statusText}`)

        if (!response.ok) {
          // Handle 403 as expected response (not an error)
          if (response.status === 403) {
            logger.info(`IndexNow Rank Tracker: 403 response received (expected behavior)`)
            const data = await response.json().catch(() => ({ rank: null, message: 'Access forbidden' }))
            return data
          }
          
          // Try to get response body for more details for other errors
          let errorDetails = ''
          try {
            errorDetails = await response.text()
            logger.error(`IndexNow Rank Tracker: Error response body: ${errorDetails}`)
          } catch (e) {
            logger.error('IndexNow Rank Tracker: Could not read error response body')
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`)
        }

        const data = await response.json()
        logger.info(`IndexNow Rank Tracker: Request successful, rank: ${data.rank}, execution time: ${data.execution_time}s`)
        return data

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        logger.warn(`IndexNow Rank Tracker: Attempt ${attempt}/3 failed:`, lastError.message)
        
        if (attempt < 3) {
          // Wait before retry: 5s, 10s (longer delays for custom backend)
          await this.delay(attempt * 5000)
        }
      }
    }

    throw lastError || new Error('All retry attempts failed')
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}