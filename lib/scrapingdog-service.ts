/**
 * ScrapingDog API Integration Service
 * Handles rank checking via ScrapingDog's Google Search API
 */

// Simple console logger for development
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
}

interface ScrapingDogConfig {
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

interface ScrapingDogApiResponse {
  organic_results?: Array<{
    rank: number
    link: string
    title: string
    snippet: string
  }>
  error?: string
  message?: string
}

export class ScrapingDogService {
  private config: ScrapingDogConfig

  constructor(apiKey: string) {
    this.config = {
      apiKey,
      baseUrl: 'https://api.scrapingdog.com/google/'
    }
  }

  /**
   * Check keyword ranking position for a specific domain
   */
  async checkKeywordRank(request: RankCheckRequest): Promise<RankCheckResponse> {
    try {
      logger.info(`ScrapingDog: Checking rank for keyword "${request.keyword}" domain "${request.domain}"`)

      // Build API request parameters
      const params = {
        api_key: this.config.apiKey,
        query: request.keyword,
        results: 100, // Check first 100 results
        country: request.country,
        mob_search: request.deviceType === 'mobile',
        page: 0
      }

      // Make API request
      const response = await this.makeRequest(params)
      
      if (response.error) {
        throw new Error(response.error || response.message || 'Unknown API error')
      }

      // Process response to find domain ranking
      return this.processResponse(response, request.domain)

    } catch (error) {
      logger.error('ScrapingDog rank check failed:', error)
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
   * Process ScrapingDog API response to extract domain ranking
   */
  private processResponse(response: ScrapingDogApiResponse, targetDomain: string): RankCheckResponse {
    const organicResults = response.organic_results || []
    
    logger.info(`ScrapingDog: Processing ${organicResults.length} organic results`)

    // Find user's domain in results
    const domainMatch = organicResults.find(result => {
      const resultDomain = this.extractDomain(result.link)
      const cleanTargetDomain = this.extractDomain(`https://${targetDomain}`)
      return resultDomain === cleanTargetDomain
    })

    if (domainMatch) {
      logger.info(`ScrapingDog: Found domain match at position ${domainMatch.rank}`)
      return {
        position: domainMatch.rank,
        url: domainMatch.link,
        found: true,
        totalResults: organicResults.length
      }
    } else {
      logger.info(`ScrapingDog: Domain not found in top ${organicResults.length} results`)
      return {
        position: null,
        url: null,
        found: false,
        totalResults: organicResults.length
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
   * Make HTTP request to ScrapingDog API with error handling and retries
   */
  private async makeRequest(params: any): Promise<ScrapingDogApiResponse> {
    const url = new URL(this.config.baseUrl)
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })

    logger.info(`ScrapingDog: Making request to ${url.toString().replace(/api_key=[^&]+/, 'api_key=***')}`)

    // Retry logic
    let lastError: Error | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': 'IndexNow-Pro-Rank-Tracker/1.0',
            'Accept': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        } as any)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        logger.info('ScrapingDog: Request successful')
        return data

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        logger.warn(`ScrapingDog: Attempt ${attempt}/3 failed:`, lastError.message)
        
        if (attempt < 3) {
          // Wait before retry: 2s, 4s
          await this.delay(attempt * 2000)
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