/**
 * Custom Rank Tracker API Integration Service
 * Handles rank checking via custom backend API at http://160.79.119.44:5000
 */

// Simple console logger for development
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
}

interface CustomTrackerConfig {
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

export class ScrapingDogService {
  private config: CustomTrackerConfig

  constructor(apiKey: string) {
    this.config = {
      apiKey: '6c95df39-8aa4-40ee-baab-a6192587400f', // Fixed API key as provided
      baseUrl: 'http://160.79.119.44:5000'
    }
  }

  /**
   * Check keyword ranking position for a specific domain
   */
  async checkKeywordRank(request: RankCheckRequest): Promise<RankCheckResponse> {
    try {
      logger.info(`Custom Tracker: Checking rank for keyword "${request.keyword}" domain "${request.domain}"`)

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
      logger.error('Custom Tracker rank check failed:', error)
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
    logger.info(`Custom Tracker: Processing response for keyword "${response.keyword}"`)

    if (response.rank && response.rank > 0) {
      logger.info(`Custom Tracker: Found domain at position ${response.rank}`)
      return {
        position: response.rank,
        url: response.url,
        found: true,
        totalResults: 50 // Assuming max_pages: 50 means 50*10 = 500 results checked
      }
    } else {
      logger.info(`Custom Tracker: Domain not found in search results`)
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
    const url = `${this.config.baseUrl}/track-keyword`

    logger.info(`Custom Tracker: Making request to ${url} for keyword "${requestBody.keyword}"`)

    // Retry logic
    let lastError: Error | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.info(`Custom Tracker: Sending request with headers: X-API-Key: ***masked***, Host: localhost`)
        logger.info(`Custom Tracker: Request body: ${JSON.stringify(requestBody)}`)
        
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

        logger.info(`Custom Tracker: Response status: ${response.status} ${response.statusText}`)

        if (!response.ok) {
          // Try to get response body for more details
          let errorDetails = ''
          try {
            errorDetails = await response.text()
            logger.error(`Custom Tracker: Error response body: ${errorDetails}`)
          } catch (e) {
            logger.error('Custom Tracker: Could not read error response body')
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`)
        }

        const data = await response.json()
        logger.info(`Custom Tracker: Request successful, rank: ${data.rank}, execution time: ${data.execution_time}s`)
        return data

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        logger.warn(`Custom Tracker: Attempt ${attempt}/3 failed:`, lastError.message)
        
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