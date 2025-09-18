/**
 * Simple Keyword Enrichment Background Worker
 * Checks user keywords and enriches them using SeRanking API
 * Uses existing indb_keyword_keywords and indb_keyword_bank tables
 */

import * as cron from 'node-cron';
import { supabaseAdmin } from '../database/supabase';
import { KeywordBankService } from '../rank-tracking/seranking/services/KeywordBankService';
import { SeRankingApiClient } from '../rank-tracking/seranking/client/SeRankingApiClient';
import { KeywordEnrichmentService } from '../rank-tracking/seranking/services/KeywordEnrichmentService';
import { ErrorHandlingService } from '../rank-tracking/seranking/services/ErrorHandlingService';
import { IntegrationService } from '../rank-tracking/seranking/services/IntegrationService';

interface KeywordToEnrich {
  id: string;
  user_id: string;
  keyword: string;
  country_id: string;
  keyword_bank_id: string | null;
  intelligence_updated_at: string | null;
}

export class KeywordEnrichmentWorker {
  private static instance: KeywordEnrichmentWorker | null = null;
  private isRunning: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;
  
  private keywordBankService: KeywordBankService;
  private enrichmentService: KeywordEnrichmentService;
  private errorHandler: ErrorHandlingService;
  private integrationService: IntegrationService;

  private async initialize() {
    // Initialize services
    this.keywordBankService = new KeywordBankService();
    this.errorHandler = new ErrorHandlingService();
    
    // Initialize integration service to get API key from database
    this.integrationService = new IntegrationService({
      defaultQuotaLimit: 1000,
      enableMetrics: true,
      logLevel: 'info'
    } as any, {} as any); // We'll only use getIntegrationSettings method

    // Get API key directly from database using correct column name 'apikey'
    const { data: integrationData, error } = await supabaseAdmin
      .from('indb_site_integration')
      .select('apikey')
      .eq('service_name', 'seranking_keyword_export')
      .eq('is_active', true)
      .single();

    const apiKey = integrationData?.apikey || '';
    
    if (!apiKey) {
      console.warn('[Keyword Enrichment Worker] No SeRanking API key found in database');
    } else {
      console.log('[Keyword Enrichment Worker] ✅ Found SeRanking API key in database');
    }

    // Initialize SeRanking API client with API key from database
    const apiClient = new SeRankingApiClient({
      apiKey: apiKey,
      baseUrl: 'https://api.seranking.com',
      timeout: 30000
    });

    // Initialize enrichment service with 30-day cache
    this.enrichmentService = new KeywordEnrichmentService(
      this.keywordBankService,
      apiClient,
      this.errorHandler,
      {
        cacheExpiryDays: 30,
        batchSize: 10, // Small batches to be gentle
        maxConcurrentRequests: 2
      }
    );
  }

  private constructor() {
    // Constructor is now empty, initialization happens in initialize() method
  }

  static async getInstance(): Promise<KeywordEnrichmentWorker> {
    if (!KeywordEnrichmentWorker.instance) {
      KeywordEnrichmentWorker.instance = new KeywordEnrichmentWorker();
      await KeywordEnrichmentWorker.instance.initialize();
    }
    return KeywordEnrichmentWorker.instance;
  }

  /**
   * Start the background worker
   * Runs immediately on startup, then every hour to check for keywords that need enrichment
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('✅ Keyword enrichment worker is already running');
      return;
    }

    console.log('🚀 [Keyword Enrichment] Starting background worker...');
    this.isRunning = true;

    // Wait for enrichmentService to be ready before processing keywords
    while (!this.enrichmentService) {
      console.log('⏳ [Keyword Enrichment] Waiting for service initialization...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Run immediately on startup to check for keywords
    console.log('⚡ [Keyword Enrichment] Running initial keyword check...');
    await this.processKeywords().catch(error => {
      console.error('❌ [Keyword Enrichment] Initial run failed:', error);
    });

    // Then schedule to run every hour at minute 30
    this.cronJob = cron.schedule('30 * * * *', async () => {
      await this.processKeywords();
    }, {
      timezone: 'UTC'
    });

    console.log('✅ [Keyword Enrichment] Background worker started - running immediately and then every hour');
  }

  /**
   * Stop the background worker
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⏹️ [Keyword Enrichment] Worker is not running');
      return;
    }

    console.log('🛑 [Keyword Enrichment] Stopping background worker...');
    this.isRunning = false;

    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }

    console.log('✅ [Keyword Enrichment] Background worker stopped');
  }

  /**
   * Main processing function - find and enrich keywords
   */
  private async processKeywords(): Promise<void> {
    try {
      console.log('🔍 [Keyword Enrichment] Checking for keywords to enrich...');
      
      // Find keywords that need enrichment
      const keywordsToEnrich = await this.findKeywordsNeedingEnrichment();
      
      if (keywordsToEnrich.length === 0) {
        console.log('✅ [Keyword Enrichment] No keywords need enrichment');
        return;
      }

      console.log(`📝 [Keyword Enrichment] Found ${keywordsToEnrich.length} keywords to enrich`);

      // Process keywords in small batches
      let processed = 0;
      let successful = 0;
      
      for (const keyword of keywordsToEnrich) {
        try {
          await this.enrichKeyword(keyword);
          successful++;
          processed++;
          
          // Small delay between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ [Keyword Enrichment] Failed to enrich "${keyword.keyword}":`, error);
          processed++;
        }
      }

      console.log(`✅ [Keyword Enrichment] Processed ${processed} keywords, ${successful} successful`);

    } catch (error) {
      console.error('❌ [Keyword Enrichment] Error in processKeywords:', error);
    }
  }

  /**
   * Find keywords that need enrichment
   * Simple logic: get keywords from indb_keyword_keywords where keyword_bank_id IS NULL
   */
  private async findKeywordsNeedingEnrichment(limit: number = 50): Promise<KeywordToEnrich[]> {
    try {
      console.log('🔍 [Keyword Enrichment] Finding keywords without keyword_bank_id...');

      const { data, error } = await supabaseAdmin
        .from('indb_keyword_keywords')
        .select('id, user_id, keyword, country_id, keyword_bank_id, intelligence_updated_at')
        .eq('is_active', true)
        .is('keyword_bank_id', null)  // Simple: get keywords that don't have bank reference
        .limit(limit);

      if (error) {
        console.error('❌ [Keyword Enrichment] Error finding keywords:', error);
        return [];
      }

      console.log(`📊 [Keyword Enrichment] Found ${(data || []).length} keywords without enrichment data`);
      return data || [];
      
    } catch (error) {
      console.error('❌ [Keyword Enrichment] Error in findKeywordsNeedingEnrichment:', error);
      return [];
    }
  }

  /**
   * Enrich a single keyword
   */
  private async enrichKeyword(keyword: KeywordToEnrich): Promise<void> {
    try {
      console.log(`🔄 [Keyword Enrichment] Enriching keyword: "${keyword.keyword}"`);

      // Get ISO2 code from country_id - lookup from countries table to get the actual ISO2 code
      console.log(`🔍 [Keyword Enrichment] Looking up country_id: ${keyword.country_id} for keyword: "${keyword.keyword}"`);
      
      const { data: countryData, error: countryError } = await supabaseAdmin
        .from('indb_keyword_countries')
        .select('iso2_code, name')
        .eq('id', keyword.country_id)
        .single();

      if (countryError || !countryData) {
        console.error(`❌ [Keyword Enrichment] Could not find country for keyword "${keyword.keyword}"`);
        console.error(`❌ [Keyword Enrichment] Country ID: ${keyword.country_id}, Error:`, countryError);
        return;
      }

      console.log(`✅ [Keyword Enrichment] Found country: ${countryData.name} (${countryData.iso2_code}) for keyword: "${keyword.keyword}"`);

      // Use lowercase ISO2 code for KeywordBankService (it expects direct ISO2 codes like "id", "us")
      const countryCodeForBank = countryData.iso2_code.toLowerCase();
      console.log(`🔄 [Keyword Enrichment] Using country code for bank: "${countryCodeForBank}"`);
      
      const result = await this.enrichmentService.enrichKeyword(
        keyword.keyword, 
        countryCodeForBank
      );

      console.log(`🔍 [Keyword Enrichment] Enrichment result for "${keyword.keyword}":`, {
        success: result.success,
        hasData: !!result.data,
        dataFound: result.data?.is_data_found,
        volume: result.data?.volume,
        bankId: result.data?.id
      });

      if (result.success && result.data) {
        // Update the keyword record with bank_id and intelligence data
        // ALWAYS update keyword_bank_id regardless of is_data_found status
        const updateData: any = {
          keyword_bank_id: result.data.id,
          search_volume: result.data.volume,
          cpc: result.data.cpc,
          competition: result.data.competition,
          difficulty: result.data.difficulty,
          keyword_intent: result.data.keyword_intent,
          history_trend: result.data.history_trend,
          intelligence_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log(`📝 [Keyword Enrichment] Updating keyword "${keyword.keyword}" with bank_id: ${result.data.id}, is_data_found: ${result.data.is_data_found}`);

        const { error: updateError } = await supabaseAdmin
          .from('indb_keyword_keywords')
          .update(updateData)
          .eq('id', keyword.id);

        if (updateError) {
          console.error(`❌ [Keyword Enrichment] Failed to update keyword "${keyword.keyword}":`, updateError);
        } else {
          if (result.data.is_data_found) {
            console.log(`✅ [Keyword Enrichment] Successfully enriched: "${keyword.keyword}" (volume: ${result.data.volume})`);
          } else {
            console.log(`✅ [Keyword Enrichment] Successfully processed: "${keyword.keyword}" (no market data available)`);
          }
        }
      } else {
        console.error(`❌ [Keyword Enrichment] Failed to enrich keyword "${keyword.keyword}":`, {
          success: result.success,
          error: result.error,
          hasData: !!result.data
        });
      }

    } catch (error) {
      console.error(`❌ [Keyword Enrichment] Error enriching keyword "${keyword.keyword}":`, error);
    }
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isRunning: boolean;
    schedule: string;
    description: string;
  } {
    return {
      isRunning: this.isRunning,
      schedule: '30 * * * *',
      description: 'Checks for keywords needing enrichment every hour'
    };
  }

  /**
   * Manual trigger for testing
   */
  async runManually(): Promise<void> {
    console.log('🚀 [Keyword Enrichment] Manual trigger started...');
    await this.processKeywords();
    console.log('✅ [Keyword Enrichment] Manual trigger completed');
  }
}

// Export singleton instance
export const keywordEnrichmentWorker = KeywordEnrichmentWorker.getInstance();