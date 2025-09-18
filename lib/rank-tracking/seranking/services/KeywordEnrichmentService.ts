/**
 * Keyword Enrichment Service
 * Main business logic coordinator for keyword intelligence workflow
 * Orchestrates cache-first strategy, API calls, validation, and error handling
 */

import {
  SeRankingKeywordData,
  SeRankingApiResponse,
  ServiceResponse,
  BulkProcessingJob,
  QuotaStatus,
  ApiMetrics,
  HealthCheckResult,
  SeRankingError,
  SeRankingErrorType
} from '../types/SeRankingTypes';

import {
  KeywordBankEntity,
  KeywordBankInsert,
  KeywordBankUpdate,
  KeywordBankQuery,
  KeywordBankQueryResult,
  KeywordBankOperationResult,
  BulkKeywordBankOperationResult,
  CacheStatus,
  CacheStats,
  KeywordLookupParams
} from '../types/KeywordBankTypes';

import {
  ISeRankingApiClient,
  IKeywordBankService,
  IKeywordEnrichmentService
} from '../types/ServiceTypes';

import { ValidationService, ValidationResult } from './ValidationService';
import { ErrorHandlingService } from './ErrorHandlingService';
import { KeywordBankService } from './KeywordBankService';
import { SeRankingApiClient } from '../client/SeRankingApiClient';

// Configuration interface
export interface KeywordEnrichmentConfig {
  cacheExpiryDays: number;
  batchSize: number;
  maxConcurrentRequests: number;
  enableMetrics: boolean;
  enableCachePreloading: boolean;
  defaultLanguageCode: string;
  quotaThresholdWarning: number;
  quotaThresholdError: number;
  enableGracefulDegradation: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Batch request type
export interface BatchKeywordRequest {
  keyword: string;
  countryCode: string;
  languageCode?: string;
  priority?: 'high' | 'normal' | 'low';
}

export class KeywordEnrichmentService implements IKeywordEnrichmentService {
  private config: KeywordEnrichmentConfig;
  private keywordBankService: IKeywordBankService;
  private apiClient: ISeRankingApiClient;
  private errorHandler: ErrorHandlingService;
  private validationService: ValidationService;
  private metrics: ApiMetrics;
  private activeJobs: Map<string, BulkProcessingJob> = new Map();
  private quotaStatus?: QuotaStatus;
  private lastQuotaCheck?: Date;

  constructor(
    keywordBankService: IKeywordBankService,
    apiClient: ISeRankingApiClient,
    errorHandler?: ErrorHandlingService,
    config: Partial<KeywordEnrichmentConfig> = {}
  ) {
    this.config = {
      cacheExpiryDays: 30,  // Changed from 7 to 30 days
      batchSize: 25,
      maxConcurrentRequests: 3,
      enableMetrics: true,
      enableCachePreloading: false,
      defaultLanguageCode: 'en',
      quotaThresholdWarning: 0.8,
      quotaThresholdError: 0.95,
      enableGracefulDegradation: true,
      logLevel: 'info',
      ...config
    };

    this.keywordBankService = keywordBankService;
    this.apiClient = apiClient;
    this.errorHandler = errorHandler || new ErrorHandlingService();
    this.validationService = new ValidationService();

    this.metrics = {
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      average_response_time: 0,
      cache_hits: 0,
      cache_misses: 0
    };

    // Initialize services
    this.initialize();
  }

  /**
   * Initialize service and perform health checks
   */
  private async initialize(): Promise<void> {
    try {
      this.log('info', 'Initializing KeywordEnrichmentService');
      
      // Check API health
      const health = await this.apiClient.testConnection();
      if (health.status !== 'healthy') {
        this.log('warn', `API health check failed: ${health.error_message}`);
      }

      // Update quota status
      await this.updateQuotaStatus();
      
      this.log('info', 'KeywordEnrichmentService initialized successfully');
    } catch (error) {
      this.log('error', `Failed to initialize KeywordEnrichmentService: ${error}`);
    }
  }

  /**
   * Enrich single keyword with intelligence data (cache-first strategy)
   */
  async enrichKeyword(
    keyword: string,
    countryCode: string,
    forceRefresh: boolean = false
  ): Promise<ServiceResponse<KeywordBankEntity>> {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      const validation = ValidationService.validateKeywordBankInsert({
        keyword,
        country_code: countryCode,
        language_code: this.config.defaultLanguageCode,
        is_data_found: false
      });

      if (!validation.isValid) {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Invalid input parameters',
          { errors: validation.errors }
        );
      }

      // Check cache first (if not forcing refresh)
      let cachedData: KeywordBankEntity | null = null;
      if (!forceRefresh) {
        cachedData = await this.getCachedKeywordDataInternal(keyword, countryCode);
        
        if (cachedData && this.isCacheFresh(cachedData)) {
          this.metrics.cache_hits++;
          this.metrics.successful_requests++;
          
          return {
            success: true,
            data: cachedData,
            metadata: {
              source: 'cache',
              timestamp: new Date()
            }
          };
        }
      }

      // Cache miss or force refresh - fetch from API
      this.metrics.cache_misses++;
      
      // Check quota before making API call
      const quotaOk = await this.checkQuotaStatus();
      if (!quotaOk) {
        return this.handleQuotaExceeded(cachedData);
      }

      // Fetch from API
      const apiResponse = await this.fetchFromApi([keyword], countryCode);
      if (!apiResponse.success || !apiResponse.data || apiResponse.data.length === 0) {
        return this.handleApiFailure(apiResponse.error, cachedData);
      }

      // Process and store API data
      const apiKeywordData = apiResponse.data[0];
      const enrichedData = await this.storeEnrichedData(
        keyword,
        countryCode,
        this.config.defaultLanguageCode,
        apiKeywordData
      );

      if (!enrichedData.success) {
        return this.createErrorResponse(
          SeRankingErrorType.UNKNOWN_ERROR,
          'Failed to store enriched data',
          { error: enrichedData.error }
        );
      }

      this.metrics.successful_requests++;
      
      return {
        success: true,
        data: enrichedData.data!,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };

    } catch (error) {
      this.metrics.failed_requests++;
      
      const recoveryResult = await this.errorHandler.handleError(
        error as Error,
        {
          operation: 'enrichKeyword',
          timestamp: new Date(),
          keywords: [keyword],
          countryCode
        }
      );

      if (recoveryResult.success) {
        return {
          success: true,
          data: recoveryResult.data as KeywordBankEntity,
          metadata: {
            source: recoveryResult.fallbackUsed ? 'cache' : 'api',
            timestamp: new Date()
          }
        };
      }

      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to enrich keyword',
        { error: error, recoveryResult }
      );
    }
  }

  /**
   * Enrich multiple keywords efficiently with batch processing
   */
  async enrichKeywordsBulk(
    keywords: Array<{keyword: string; countryCode: string}>
  ): Promise<ServiceResponse<BulkProcessingJob>> {
    const jobId = this.generateJobId();
    const startTime = Date.now();

    try {
      // Validate batch request
      if (!keywords || keywords.length === 0) {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'No keywords provided for bulk enrichment'
        );
      }

      if (keywords.length > 1000) {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Too many keywords in batch (max 1000)'
        );
      }

      // Create processing job
      const job: BulkProcessingJob = {
        id: jobId,
        keywords: keywords.map(k => ({
          keyword: k.keyword,
          country_code: k.countryCode,
          language_code: this.config.defaultLanguageCode,
          priority: 'normal'
        })),
        status: 'queued',
        progress: {
          total: keywords.length,
          processed: 0,
          successful: 0,
          failed: 0
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      this.activeJobs.set(jobId, job);

      // Process batch asynchronously
      this.processBatchJob(job).catch(error => {
        this.log('error', `Batch job ${jobId} failed: ${error}`);
        job.status = 'failed';
        job.error_message = error.message;
        job.updated_at = new Date();
      });

      return {
        success: true,
        data: job,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };

    } catch (error) {
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to create bulk enrichment job',
        { error }
      );
    }
  }

  /**
   * Get enrichment job status
   */
  async getJobStatus(jobId: string): Promise<ServiceResponse<BulkProcessingJob>> {
    const startTime = Date.now();
    
    try {
      const job = this.activeJobs.get(jobId);
      
      if (!job) {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Job not found',
          { jobId }
        );
      }

      return {
        success: true,
        data: job,
        metadata: {
          source: 'cache',
          timestamp: new Date()
        }
      };

    } catch (error) {
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to get job status',
        { error, jobId }
      );
    }
  }

  /**
   * Cancel enrichment job
   */
  async cancelJob(jobId: string): Promise<ServiceResponse<boolean>> {
    const startTime = Date.now();
    
    try {
      const job = this.activeJobs.get(jobId);
      
      if (!job) {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Job not found',
          { jobId }
        );
      }

      if (job.status === 'completed' || job.status === 'failed') {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Cannot cancel completed or failed job',
          { jobId, status: job.status }
        );
      }

      job.status = 'cancelled';
      job.updated_at = new Date();

      return {
        success: true,
        data: true,
        metadata: {
          source: 'cache',
          timestamp: new Date()
        }
      };

    } catch (error) {
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to cancel job',
        { error, jobId }
      );
    }
  }

  /**
   * Retry failed keyword enrichments
   */
  async retryFailedEnrichments(jobId: string): Promise<ServiceResponse<BulkProcessingJob>> {
    const startTime = Date.now();
    
    try {
      const job = this.activeJobs.get(jobId);
      
      if (!job) {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Job not found',
          { jobId }
        );
      }

      if (job.status !== 'failed' && job.status !== 'completed') {
        return this.createErrorResponse(
          SeRankingErrorType.INVALID_REQUEST_ERROR,
          'Cannot retry job that is not completed or failed',
          { jobId, status: job.status }
        );
      }

      // Reset failed portions and restart
      job.status = 'queued';
      job.progress.processed -= job.progress.failed;
      job.progress.failed = 0;
      job.updated_at = new Date();
      job.error_message = undefined;

      // Restart processing
      this.processBatchJob(job).catch(error => {
        this.log('error', `Retry batch job ${jobId} failed: ${error}`);
        job.status = 'failed';
        job.error_message = error.message;
        job.updated_at = new Date();
      });

      return {
        success: true,
        data: job,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };

    } catch (error) {
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to retry job',
        { error, jobId }
      );
    }
  }

  /**
   * Get cached keyword data only (no API calls)
   */
  async getCachedKeywordData(
    keyword: string,
    countryCode: string
  ): Promise<ServiceResponse<KeywordBankEntity | null>> {
    const startTime = Date.now();
    
    try {
      const cachedData = await this.getCachedKeywordDataInternal(keyword, countryCode);
      
      return {
        success: true,
        data: cachedData,
        metadata: {
          source: 'cache',
          timestamp: new Date()
        }
      };

    } catch (error) {
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to get cached data',
        { error }
      );
    }
  }

  /**
   * Force refresh keyword data from API
   */
  async refreshKeywordData(
    keyword: string,
    countryCode: string
  ): Promise<ServiceResponse<KeywordBankEntity>> {
    return this.enrichKeyword(keyword, countryCode, true);
  }

  /**
   * Get keyword statistics and analytics
   */
  async getKeywordStats(): Promise<ServiceResponse<{
    cache_stats: CacheStats;
    api_metrics: ApiMetrics;
    quota_status?: QuotaStatus;
    active_jobs: number;
  }>> {
    const startTime = Date.now();
    
    try {
      // Get bank statistics through service if available
      let cacheStats: CacheStats;
      
      if (this.keywordBankService instanceof KeywordBankService) {
        const bankStats = await this.keywordBankService.getBankStats();
        
        cacheStats = {
          total_entries: bankStats.total_keywords,
          cache_hits: this.metrics.cache_hits,
          cache_misses: this.metrics.cache_misses,
          hit_ratio: this.metrics.cache_hits / (this.metrics.cache_hits + this.metrics.cache_misses || 1),
          average_age: bankStats.average_age_days,
          expired_entries: 0,
          memory_usage: 0,
          total_keywords: bankStats.total_keywords,
          keywords_with_data: bankStats.with_data,
          keywords_without_data: bankStats.without_data,
          fresh_data: 0,
          stale_data: 0,
          data_found_rate: bankStats.with_data / (bankStats.total_keywords || 1),
          fresh_data_rate: 0,
          last_updated: new Date().toISOString()
        };
      } else {
        // Fallback stats structure
        cacheStats = {
          total_entries: 0,
          cache_hits: this.metrics.cache_hits,
          cache_misses: this.metrics.cache_misses,
          hit_ratio: this.metrics.cache_hits / (this.metrics.cache_hits + this.metrics.cache_misses || 1),
          average_age: 0,
          expired_entries: 0,
          memory_usage: 0,
          total_keywords: 0,
          keywords_with_data: 0,
          keywords_without_data: 0,
          fresh_data: 0,
          stale_data: 0,
          data_found_rate: 0,
          fresh_data_rate: 0,
          last_updated: new Date().toISOString()
        };
      }

      // Update quota status
      await this.updateQuotaStatus();

      return {
        success: true,
        data: {
          cache_stats: cacheStats,
          api_metrics: this.metrics,
          quota_status: this.quotaStatus,
          active_jobs: this.activeJobs.size
        },
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };

    } catch (error) {
      return this.createErrorResponse(
        SeRankingErrorType.UNKNOWN_ERROR,
        'Failed to get keyword stats',
        { error }
      );
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<ServiceResponse<HealthCheckResult>> {
    const startTime = Date.now();
    
    try {
      const apiHealth = await this.apiClient.testConnection();
      const quotaOk = await this.checkQuotaStatus();
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let errorMessage: string | undefined;
      
      if (apiHealth.status === 'unhealthy') {
        status = 'unhealthy';
        errorMessage = `API unhealthy: ${apiHealth.error_message}`;
      } else if (apiHealth.status === 'degraded' || !quotaOk) {
        status = 'degraded';
        errorMessage = !quotaOk ? 'Quota exceeded or near limit' : apiHealth.error_message;
      }

      const healthResult: HealthCheckResult = {
        status,
        response_time: Date.now() - startTime,
        last_check: new Date(),
        error_message: errorMessage
      };

      return {
        success: true,
        data: healthResult,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };

    } catch (error) {
      const healthResult: HealthCheckResult = {
        status: 'unhealthy',
        response_time: Date.now() - startTime,
        last_check: new Date(),
        error_message: error instanceof Error ? error.message : 'Unknown error'
      };

      return {
        success: false,
        data: healthResult,
        error: {
          type: SeRankingErrorType.UNKNOWN_ERROR,
          message: 'Health check failed',
          details: error
        },
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };
    }
  }

  // Private helper methods

  private async getCachedKeywordDataInternal(
    keyword: string,
    countryCode: string
  ): Promise<KeywordBankEntity | null> {
    try {
      return await this.keywordBankService.getKeywordData(keyword, countryCode);
    } catch (error) {
      this.log('warn', `Failed to get cached data for ${keyword}: ${error}`);
      return null;
    }
  }

  private isCacheFresh(data: KeywordBankEntity): boolean {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - this.config.cacheExpiryDays);
    return new Date(data.data_updated_at) > expiryDate;
  }

  private async fetchFromApi(
    keywords: string[],
    countryCode: string
  ): Promise<ServiceResponse<SeRankingApiResponse>> {
    try {
      const apiResponse = await this.apiClient.fetchKeywordData(keywords, countryCode);
      
      // Validate API response
      const validation = ValidationService.validateApiResponse(apiResponse);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            type: SeRankingErrorType.PARSING_ERROR,
            message: 'Invalid API response format',
            details: validation.errors
          }
        };
      }

      return {
        success: true,
        data: apiResponse,
        metadata: {
          source: 'api',
          timestamp: new Date()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: this.mapErrorType(error),
          message: error instanceof Error ? error.message : 'Unknown API error',
          details: error
        }
      };
    }
  }

  private async storeEnrichedData(
    keyword: string,
    countryCode: string,
    languageCode: string,
    apiData: SeRankingKeywordData
  ): Promise<KeywordBankOperationResult> {
    const insertData: KeywordBankInsert = {
      keyword: keyword.trim().toLowerCase(),
      country_code: countryCode.toLowerCase(),
      language_code: languageCode.toLowerCase(),
      is_data_found: apiData.is_data_found,
      volume: apiData.volume,
      cpc: apiData.cpc,
      competition: apiData.competition,
      difficulty: apiData.difficulty,
      history_trend: apiData.history_trend
    };

    try {
      return await this.keywordBankService.upsertKeywordData(insertData);
    } catch (error) {
      this.log('error', `Failed to store enriched data for ${keyword}: ${error}`);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown storage error',
          details: error
        }
      };
    }
  }

  private async processBatchJob(job: BulkProcessingJob): Promise<void> {
    job.status = 'processing';
    job.updated_at = new Date();

    const batches = this.createBatches(job.keywords, this.config.batchSize);
    
    for (const batch of batches) {
      if (job.status === 'cancelled' as any) {
        break;
      }

      try {
        await this.processBatch(batch, job);
      } catch (error) {
        this.log('error', `Batch processing error: ${error}`);
        job.progress.failed += batch.length;
      }
    }

    // Update final job status
    if (job.status !== 'cancelled') {
      job.status = job.progress.failed > 0 ? 'failed' : 'completed';
      job.completed_at = new Date();
    }
    
    job.updated_at = new Date();
  }

  private async processBatch(
    batch: Array<{keyword: string; country_code: string; language_code?: string}>,
    job: BulkProcessingJob
  ): Promise<void> {
    for (const request of batch) {
      if (job.status === 'cancelled' as any) {
        break;
      }

      try {
        const result = await this.enrichKeyword(
          request.keyword,
          request.country_code
        );

        if (result.success) {
          job.progress.successful++;
        } else {
          job.progress.failed++;
        }

        job.progress.processed++;
        job.updated_at = new Date();

        // Small delay to prevent overwhelming the API
        await this.delay(100);

      } catch (error) {
        job.progress.failed++;
        job.progress.processed++;
        this.log('error', `Failed to process ${request.keyword}: ${error}`);
      }
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async checkQuotaStatus(): Promise<boolean> {
    try {
      // Check if we need to update quota status (every 5 minutes)
      if (!this.lastQuotaCheck || Date.now() - this.lastQuotaCheck.getTime() > 300000) {
        await this.updateQuotaStatus();
      }

      if (!this.quotaStatus) {
        return true; // Allow if we can't check quota
      }

      return !this.quotaStatus.is_quota_exceeded && 
             this.quotaStatus.usage_percentage < this.config.quotaThresholdError;

    } catch (error) {
      this.log('warn', `Failed to check quota status: ${error}`);
      return true; // Allow on error
    }
  }

  private async updateQuotaStatus(): Promise<void> {
    try {
      this.quotaStatus = await this.apiClient.getQuotaStatus();
      this.lastQuotaCheck = new Date();
    } catch (error) {
      this.log('warn', `Failed to update quota status: ${error}`);
    }
  }

  private handleQuotaExceeded(
    fallbackData?: KeywordBankEntity | null
  ): ServiceResponse<KeywordBankEntity> {
    if (this.config.enableGracefulDegradation && fallbackData) {
      return {
        success: true,
        data: fallbackData,
        metadata: {
          source: 'cache',
          timestamp: new Date()
        }
      };
    }

    return this.createErrorResponse(
      SeRankingErrorType.QUOTA_EXCEEDED_ERROR,
      'API quota exceeded',
      { quotaStatus: this.quotaStatus }
    );
  }

  private handleApiFailure(
    error?: { type: SeRankingErrorType; message: string; details?: any },
    fallbackData?: KeywordBankEntity | null
  ): ServiceResponse<KeywordBankEntity> {
    if (this.config.enableGracefulDegradation && fallbackData) {
      return {
        success: true,
        data: fallbackData,
        metadata: {
          source: 'cache',
          timestamp: new Date()
        }
      };
    }

    return this.createErrorResponse(
      error?.type || SeRankingErrorType.UNKNOWN_ERROR,
      error?.message || 'API call failed',
      { apiError: error, fallbackData }
    );
  }

  private createErrorResponse<T>(
    errorType: SeRankingErrorType,
    message: string,
    details?: any
  ): ServiceResponse<T> {
    return {
      success: false,
      error: {
        type: errorType,
        message,
        details
      },
      metadata: {
        source: 'api',
        timestamp: new Date()
      }
    };
  }

  private mapErrorType(error: any): SeRankingErrorType {
    if (error instanceof Error) {
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return SeRankingErrorType.QUOTA_EXCEEDED_ERROR;
      }
      if (error.message.includes('auth') || error.message.includes('401')) {
        return SeRankingErrorType.AUTHENTICATION_ERROR;
      }
      if (error.message.includes('rate') || error.message.includes('429')) {
        return SeRankingErrorType.RATE_LIMIT_ERROR;
      }
      if (error.message.includes('timeout')) {
        return SeRankingErrorType.TIMEOUT_ERROR;
      }
      if (error.message.includes('network') || error.message.includes('connection')) {
        return SeRankingErrorType.NETWORK_ERROR;
      }
    }
    return SeRankingErrorType.UNKNOWN_ERROR;
  }

  private generateJobId(): string {
    return `enrichment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (this.shouldLog(level)) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        service: 'KeywordEnrichmentService',
        message,
        data
      };
      
      console[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](
        JSON.stringify(logEntry)
      );
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.config.logLevel];
  }

  // Static factory methods
  static createDefaultConfig(): KeywordEnrichmentConfig {
    return {
      cacheExpiryDays: 7,
      batchSize: 25,
      maxConcurrentRequests: 3,
      enableMetrics: true,
      enableCachePreloading: false,
      defaultLanguageCode: 'en',
      quotaThresholdWarning: 0.8,
      quotaThresholdError: 0.95,
      enableGracefulDegradation: true,
      logLevel: 'info'
    };
  }

  static createProductionConfig(): KeywordEnrichmentConfig {
    return {
      ...KeywordEnrichmentService.createDefaultConfig(),
      batchSize: 50,
      maxConcurrentRequests: 5,
      enableMetrics: true,
      enableCachePreloading: true,
      logLevel: 'warn'
    };
  }

  static createDevelopmentConfig(): KeywordEnrichmentConfig {
    return {
      ...KeywordEnrichmentService.createDefaultConfig(),
      batchSize: 10,
      maxConcurrentRequests: 1,
      enableMetrics: true,
      enableCachePreloading: false,
      logLevel: 'debug'
    };
  }
}