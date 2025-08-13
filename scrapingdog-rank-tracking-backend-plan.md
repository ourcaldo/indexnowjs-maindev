# ScrapingDog API Rank Tracking Backend Implementation Plan

## Project Context Analysis

Based on comprehensive project analysis, I understand:

### Current Infrastructure Status
- **Frontend UI**: ✅ Complete - Overview page with statistics, Rank History page with filters/tables
- **Database Schema**: ✅ Complete - All keyword tracking tables implemented with proper relationships
- **API Endpoints**: ✅ Complete - CRUD operations for domains, keywords, countries, rank history
- **Authentication**: ✅ Complete - Supabase Auth with user context
- **Missing Component**: Backend logic to fetch actual ranks using ScrapingDog API

### Existing Database Tables
```sql
-- Main keyword storage
indb_keyword_keywords (id, user_id, domain_id, keyword, device_type, country_id, tags, is_active, last_check_date)

-- Historical ranking data (30+ days)
indb_keyword_rank_history (id, keyword_id, position, url, search_volume, difficulty_score, check_date, device_type, country_id)

-- Latest/current rankings (for quick Overview page access)
indb_keyword_rankings (id, keyword_id, position, url, search_volume, difficulty_score, check_date)

-- Supporting tables
indb_keyword_domains (id, user_id, domain_name, display_name, verification_status)
indb_keyword_countries (id, name, iso2_code, iso3_code, is_active)
```

### Current Workflow Status
1. ✅ User can add domains and keywords
2. ✅ Frontend displays tracking interface 
3. ✅ Database stores keywords with metadata (device, country, tags)
4. ❌ **MISSING**: Backend process to fetch actual ranks from ScrapingDog API
5. ❌ **MISSING**: Daily automated ranking checks
6. ❌ **MISSING**: Position update logic

## Required New Components

### 1. ScrapingDog API Integration Table
**New Table Required**: `indb_site_integration`

```sql
CREATE TABLE indb_site_integration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    service_name TEXT NOT NULL DEFAULT 'scrapingdog',
    scrappingdog_apikey TEXT NOT NULL,
    api_quota_limit INTEGER DEFAULT 10000,
    api_quota_used INTEGER DEFAULT 0,
    quota_reset_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, service_name)
);

-- RLS Policy
ALTER TABLE indb_site_integration ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own integrations" ON indb_site_integration
    FOR ALL USING (auth.uid() = user_id);
```

### 2. Enhanced Rank History Schema
**Table Update Required**: Add device_type and country_id to `indb_keyword_rank_history`

```sql
-- Add missing columns to match ScrapingDog API parameters
ALTER TABLE indb_keyword_rank_history 
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'desktop',
ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES indb_keyword_countries(id);

-- Update existing records with device_type and country_id from keywords table
UPDATE indb_keyword_rank_history 
SET device_type = k.device_type, country_id = k.country_id
FROM indb_keyword_keywords k 
WHERE indb_keyword_rank_history.keyword_id = k.id;
```

## ScrapingDog API Integration Architecture

### API Request Structure
```javascript
const scrapingDogRequest = {
    api_key: "user_api_key",
    query: "keyword_to_track", 
    results: 100,
    country: "id", // from indb_keyword_countries.iso2_code
    mob_search: true, // when device_type = 'mobile'
    page: 0
}
```

### Response Processing Logic
```javascript
const processScrapingDogResponse = (response, userDomain) => {
    const organicResults = response.organic_results || [];
    
    // Find user's domain in results
    const domainMatch = organicResults.find(result => {
        const resultDomain = extractDomain(result.link);
        return resultDomain === userDomain;
    });
    
    return {
        position: domainMatch ? domainMatch.rank : null,
        url: domainMatch ? domainMatch.link : null,
        found: !!domainMatch,
        totalResults: organicResults.length
    };
}
```

## Backend Implementation Plan

### Phase 1: API Integration Service (Day 1-2)

#### 1.1 ScrapingDog Service Module
**File**: `server/services/scrapingdog.ts`

```typescript
interface ScrapingDogConfig {
    apiKey: string;
    baseUrl: string;
}

interface RankCheckRequest {
    keyword: string;
    domain: string;
    country: string; // ISO2 code
    deviceType: 'desktop' | 'mobile';
}

interface RankCheckResponse {
    position: number | null;
    url: string | null;
    found: boolean;
    totalResults: number;
    errorMessage?: string;
}

class ScrapingDogService {
    private config: ScrapingDogConfig;
    
    constructor(apiKey: string) {
        this.config = {
            apiKey,
            baseUrl: 'https://api.scrapingdog.com/google/'
        };
    }
    
    async checkKeywordRank(request: RankCheckRequest): Promise<RankCheckResponse> {
        // Implementation details below
    }
    
    private extractDomain(url: string): string {
        // Extract clean domain from URL
    }
    
    private async makeRequest(params: any): Promise<any> {
        // HTTP request with error handling and retries
    }
}
```

#### 1.2 API Key Management
**File**: `server/services/apiKeyManager.ts`

```typescript
class APIKeyManager {
    async getActiveAPIKey(userId: string): Promise<string | null> {
        // Fetch from indb_site_integration
        // Rotate keys if quota exceeded
    }
    
    async updateQuotaUsage(userId: string, apiKey: string): Promise<void> {
        // Increment api_quota_used
        // Reset if new day
    }
    
    async getAvailableQuota(userId: string): Promise<number> {
        // Return remaining quota
    }
}
```

### Phase 2: Rank Tracking Engine (Day 3-4)

#### 2.1 Core Ranking Service
**File**: `server/services/rankTracker.ts`

```typescript
interface KeywordToTrack {
    id: string;
    keyword: string;
    domain: string;
    deviceType: 'desktop' | 'mobile';
    countryCode: string;
    userId: string;
}

class RankTracker {
    private scrapingDogService: ScrapingDogService;
    private apiKeyManager: APIKeyManager;
    private database: any; // Supabase client
    
    async trackKeyword(keywordData: KeywordToTrack): Promise<void> {
        try {
            // 1. Get API key for user
            const apiKey = await this.apiKeyManager.getActiveAPIKey(keywordData.userId);
            if (!apiKey) throw new Error('No active API key found');
            
            // 2. Check remaining quota
            const quota = await this.apiKeyManager.getAvailableQuota(keywordData.userId);
            if (quota <= 0) throw new Error('API quota exceeded');
            
            // 3. Initialize ScrapingDog service
            this.scrapingDogService = new ScrapingDogService(apiKey);
            
            // 4. Make rank check request
            const rankResult = await this.scrapingDogService.checkKeywordRank({
                keyword: keywordData.keyword,
                domain: keywordData.domain,
                country: keywordData.countryCode,
                deviceType: keywordData.deviceType
            });
            
            // 5. Store result in database
            await this.storeRankResult(keywordData.id, rankResult);
            
            // 6. Update API quota
            await this.apiKeyManager.updateQuotaUsage(keywordData.userId, apiKey);
            
            // 7. Update last_check_date
            await this.updateLastCheckDate(keywordData.id);
            
        } catch (error) {
            console.error(`Rank tracking failed for keyword ${keywordData.id}:`, error);
            await this.storeFailedResult(keywordData.id, error.message);
        }
    }
    
    private async storeRankResult(keywordId: string, result: RankCheckResponse): Promise<void> {
        // Insert into indb_keyword_rank_history
        // Trigger will auto-update indb_keyword_rankings
    }
    
    private async storeFailedResult(keywordId: string, errorMessage: string): Promise<void> {
        // Store NULL position with error info
    }
    
    private async updateLastCheckDate(keywordId: string): Promise<void> {
        // UPDATE indb_keyword_keywords SET last_check_date = CURRENT_DATE
    }
}
```

#### 2.2 Batch Processing Engine
**File**: `server/services/batchProcessor.ts`

```typescript
class BatchProcessor {
    private rankTracker: RankTracker;
    private batchSize: number = 5; // Process 5 keywords at once
    private delayBetweenRequests: number = 2000; // 2 second delay
    
    async processDailyRankChecks(): Promise<void> {
        try {
            // 1. Get all keywords that need checking today
            const keywords = await this.getKeywordsToTrack();
            console.log(`Found ${keywords.length} keywords to track`);
            
            // 2. Group by user to manage quotas
            const keywordsByUser = this.groupKeywordsByUser(keywords);
            
            // 3. Process each user's keywords in batches
            for (const [userId, userKeywords] of keywordsByUser) {
                await this.processUserKeywords(userId, userKeywords);
                
                // Delay between users to avoid overwhelming API
                await this.delay(5000); // 5 second delay between users
            }
            
        } catch (error) {
            console.error('Daily rank check batch failed:', error);
        }
    }
    
    private async getKeywordsToTrack(): Promise<KeywordToTrack[]> {
        // SQL query to get keywords needing daily check
        const query = `
            SELECT 
                k.id,
                k.keyword,
                k.device_type,
                k.user_id,
                d.domain_name,
                c.iso2_code as country_code
            FROM indb_keyword_keywords k
            JOIN indb_keyword_domains d ON k.domain_id = d.id  
            JOIN indb_keyword_countries c ON k.country_id = c.id
            WHERE k.is_active = true 
            AND (k.last_check_date != CURRENT_DATE OR k.last_check_date IS NULL)
            ORDER BY k.user_id, k.created_at
        `;
    }
    
    private async processUserKeywords(userId: string, keywords: KeywordToTrack[]): Promise<void> {
        // Check user's available quota first
        const availableQuota = await this.rankTracker.apiKeyManager.getAvailableQuota(userId);
        const keywordsToProcess = keywords.slice(0, availableQuota);
        
        if (keywordsToProcess.length < keywords.length) {
            console.log(`User ${userId}: Processing ${keywordsToProcess.length}/${keywords.length} keywords (quota limit)`);
        }
        
        // Process in batches
        for (let i = 0; i < keywordsToProcess.length; i += this.batchSize) {
            const batch = keywordsToProcess.slice(i, i + this.batchSize);
            
            // Process batch in parallel (but rate limited)
            await Promise.all(batch.map(keyword => this.rankTracker.trackKeyword(keyword)));
            
            // Delay between batches
            if (i + this.batchSize < keywordsToProcess.length) {
                await this.delay(this.delayBetweenRequests);
            }
        }
    }
    
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

### Phase 3: Immediate Rank Check API (Day 5)

#### 3.1 Manual Rank Check Endpoint
**File**: `app/api/keyword-tracker/check-rank/route.ts`

```typescript
export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate user
        const user = await getServerAuthUser(request);
        if (!user) return unauthorizedResponse();
        
        // 2. Validate request body
        const body = await request.json();
        const validation = checkRankSchema.safeParse(body);
        if (!validation.success) return validationErrorResponse(validation.error);
        
        const { keyword_id } = validation.data;
        
        // 3. Get keyword details with domain and country
        const keywordData = await getKeywordWithDetails(keyword_id, user.id);
        if (!keywordData) return notFoundResponse('Keyword not found');
        
        // 4. Check user's quota
        const apiKeyManager = new APIKeyManager();
        const availableQuota = await apiKeyManager.getAvailableQuota(user.id);
        if (availableQuota <= 0) {
            return quotaExceededResponse();
        }
        
        // 5. Perform immediate rank check
        const rankTracker = new RankTracker();
        await rankTracker.trackKeyword(keywordData);
        
        // 6. Return updated ranking data
        const updatedRanking = await getLatestRanking(keyword_id);
        
        return NextResponse.json({
            success: true,
            data: updatedRanking,
            message: 'Rank check completed'
        });
        
    } catch (error) {
        console.error('Manual rank check failed:', error);
        return NextResponse.json(
            { success: false, error: 'Rank check failed' },
            { status: 500 }
        );
    }
}
```

### Phase 4: Scheduled Daily Processing (Day 6)

#### 4.1 Cron Job Implementation
**File**: `server/jobs/dailyRankCheck.ts`

```typescript
import cron from 'node-cron';
import { BatchProcessor } from '../services/batchProcessor';

class DailyRankCheckJob {
    private batchProcessor: BatchProcessor;
    private isRunning: boolean = false;
    
    constructor() {
        this.batchProcessor = new BatchProcessor();
    }
    
    start(): void {
        // Run daily at 2:00 AM UTC
        cron.schedule('0 2 * * *', async () => {
            if (this.isRunning) {
                console.log('Daily rank check already running, skipping...');
                return;
            }
            
            this.isRunning = true;
            console.log('Starting daily rank check process...');
            
            try {
                await this.batchProcessor.processDailyRankChecks();
                console.log('Daily rank check completed successfully');
            } catch (error) {
                console.error('Daily rank check failed:', error);
            } finally {
                this.isRunning = false;
            }
        });
        
        console.log('Daily rank check job scheduled');
    }
    
    // Method for manual triggering (testing/admin)
    async runManually(): Promise<void> {
        if (this.isRunning) {
            throw new Error('Daily rank check already running');
        }
        
        this.isRunning = true;
        try {
            await this.batchProcessor.processDailyRankChecks();
        } finally {
            this.isRunning = false;
        }
    }
}

export const dailyRankCheckJob = new DailyRankCheckJob();
```

#### 4.2 Job Integration in Server
**File**: `server/index.ts` (or main server file)

```typescript
import { dailyRankCheckJob } from './jobs/dailyRankCheck';

// Start the daily rank check job
dailyRankCheckJob.start();
```

### Phase 5: Error Handling & Monitoring (Day 7)

#### 5.1 Error Tracking System
**File**: `server/services/errorTracker.ts`

```typescript
interface RankCheckError {
    keywordId: string;
    userId: string;
    errorType: 'quota_exceeded' | 'api_error' | 'parsing_error' | 'network_error';
    errorMessage: string;
    timestamp: Date;
}

class ErrorTracker {
    async logError(error: RankCheckError): Promise<void> {
        // Store in database for analysis
        // Could use existing indb_analytics_error_stats table
    }
    
    async getErrorStats(userId: string, dateRange: { start: Date, end: Date }): Promise<any> {
        // Return error statistics for user
    }
    
    async getSystemErrorStats(): Promise<any> {
        // Return system-wide error statistics
    }
}
```

#### 5.2 Quota Monitoring
**File**: `server/services/quotaMonitor.ts`

```typescript
class QuotaMonitor {
    async checkQuotaHealth(): Promise<void> {
        // Monitor API key quotas across all users
        // Send alerts when quotas are running low
        // Suggest quota increases or additional API keys
    }
    
    async generateQuotaReport(): Promise<any> {
        // Daily/weekly quota usage reports
        // Efficiency metrics (successful vs failed requests)
    }
}
```

## Implementation Timeline

### Week 1: Core Infrastructure
- **Day 1**: Create `indb_site_integration` table + RLS policies
- **Day 2**: ScrapingDog service integration + API key management  
- **Day 3**: Rank tracker core logic + database operations
- **Day 4**: Batch processing engine + daily automation
- **Day 5**: Manual rank check API endpoint
- **Day 6**: Cron job implementation + scheduling
- **Day 7**: Error handling + monitoring systems

### Week 2: Testing & Optimization
- **Day 8-9**: Unit testing for all services
- **Day 10-11**: Integration testing with real API calls
- **Day 12-13**: Performance optimization + rate limiting
- **Day 14**: Documentation + deployment preparation

## Required SQL Queries for User

### 1. Create Integration Table
```sql
-- Create the API key storage table
CREATE TABLE indb_site_integration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    service_name TEXT NOT NULL DEFAULT 'scrapingdog',
    scrappingdog_apikey TEXT NOT NULL,
    api_quota_limit INTEGER DEFAULT 10000,
    api_quota_used INTEGER DEFAULT 0,
    quota_reset_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, service_name)
);

-- Enable RLS
ALTER TABLE indb_site_integration ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can only access their own integrations" ON indb_site_integration
    FOR ALL USING (auth.uid() = user_id);
```

### 2. Update Rank History Schema
```sql
-- Add device_type and country_id to rank history if not exists
ALTER TABLE indb_keyword_rank_history 
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'desktop',
ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES indb_keyword_countries(id);

-- Update existing records with proper device_type and country_id
UPDATE indb_keyword_rank_history 
SET device_type = k.device_type, country_id = k.country_id
FROM indb_keyword_keywords k 
WHERE indb_keyword_rank_history.keyword_id = k.id
AND (indb_keyword_rank_history.device_type IS NULL OR indb_keyword_rank_history.country_id IS NULL);
```

### 3. Create Quota Reset Function
```sql
-- Function to reset daily quotas
CREATE OR REPLACE FUNCTION reset_daily_quotas()
RETURNS void AS $$
BEGIN
    UPDATE indb_site_integration 
    SET api_quota_used = 0, quota_reset_date = CURRENT_DATE
    WHERE quota_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily quota reset (if supported by Supabase)
-- This might need to be handled by the application cron job
```

## Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Input    │    │  ScrapingDog API │    │   Database      │
│   (Keywords)    │    │                  │    │   Storage       │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          ▼                      │                       │
┌─────────────────┐              │                       │
│  Keyword Setup  │              │                       │
│  (Domain, Tags) │              │                       │
└─────────┬───────┘              │                       │
          │                      │                       │
          ▼                      │                       │
┌─────────────────┐    ┌─────────▼────────┐              │
│  Daily Cron Job │───▶│ Rank Check Logic │              │
│  (2:00 AM UTC)  │    │ (Batch Process)  │              │
└─────────────────┘    └─────────┬────────┘              │
                                 │                       │
                                 ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Position Found  │───▶│ Rank History    │
                       │ (Rank 1-100)    │    │ (Historical)    │
                       └─────────────────┘    └─────────┬───────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │ Current Rankings│
                                              │ (Latest Only)   │
                                              └─────────────────┘
```

## Security Considerations

### API Key Protection
- API keys stored encrypted in database
- Never expose keys in frontend code
- Implement key rotation capabilities
- Monitor for key abuse/unexpected usage patterns

### Rate Limiting
- Respect ScrapingDog API rate limits
- Implement exponential backoff on failures
- Queue system for high-volume users
- User-specific quotas to prevent abuse

### Data Privacy
- ROW LEVEL SECURITY on all new tables
- Users can only access their own rank data
- Audit logging for rank check requests
- GDPR compliance for data retention

## Performance Optimizations

### Database Efficiency
- Proper indexing on frequently queried columns
- Batch inserts for historical data
- Automatic cleanup of old rank history (90+ days)
- Connection pooling for concurrent requests

### API Efficiency  
- Intelligent retry logic with circuit breakers
- Caching of successful responses (short-term)
- Parallel processing with rate limiting
- Error aggregation to reduce redundant requests

### Monitoring Metrics
- API response times and success rates
- Daily quota usage trends
- Keyword position change distributions
- System performance and error rates

This comprehensive plan provides a robust, scalable backend implementation for rank tracking using the ScrapingDog API, maintaining the existing project architecture while adding powerful new functionality.