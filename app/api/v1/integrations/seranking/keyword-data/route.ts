/**
 * SeRanking Single Keyword Intelligence API Endpoint
 * GET /api/v1/integrations/seranking/keyword-data
 * 
 * Provides keyword intelligence data with cache-first strategy
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { KeywordEnrichmentService } from '../../../../../../lib/rank-tracking/seranking/services/KeywordEnrichmentService';
import { KeywordBankService } from '../../../../../../lib/rank-tracking/seranking/services/KeywordBankService';
import { IntegrationService } from '../../../../../../lib/rank-tracking/seranking/services/IntegrationService';
import { SeRankingApiClient } from '../../../../../../lib/rank-tracking/seranking/client/SeRankingApiClient';
import { ErrorHandlingService } from '../../../../../../lib/rank-tracking/seranking/services/ErrorHandlingService';

// Request validation schema
const KeywordDataRequestSchema = z.object({
  keyword: z.string().min(1).max(500),
  country_code: z.string().regex(/^[a-z]{2}$/i).optional().default('us'),
  language_code: z.string().regex(/^[a-z]{2}$/i).optional().default('en'),
  force_refresh: z.boolean().optional().default(false)
});

// Response interface
interface KeywordDataResponse {
  success: boolean;
  data?: {
    keyword: string;
    country_code: string;
    is_data_found: boolean;
    volume: number | null;
    cpc: number | null;
    competition: number | null;
    difficulty: number | null;
    keyword_intent: string | null;
    history_trend: Record<string, number> | null;
    source: 'cache' | 'api';
    last_updated: string;
  };
  quota_remaining?: number;
  cache_hit?: boolean;
  error?: string;
  message?: string;
}

async function initializeServices(userId: string = 'system'): Promise<{
  enrichmentService: KeywordEnrichmentService;
  integrationService: IntegrationService;
} | null> {
  try {
    // Initialize services
    const keywordBankService = new KeywordBankService();
    const integrationService = new IntegrationService();
    const errorHandler = new ErrorHandlingService();

    // Get SeRanking integration settings with userId
    const integrationSettings = await integrationService.getIntegrationSettings(userId);
    
    if (!integrationSettings.success || !integrationSettings.data) {
      console.error('SeRanking integration not configured');
      return null;
    }

    const { api_url } = integrationSettings.data;

    // Initialize API client with hardcoded API key for now
    const apiClient = new SeRankingApiClient({
      baseUrl: api_url,
      apiKey: '952945a4-5d7a-4719-16cd-5e4b8b3892d6', // From the plan
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    });

    // Initialize enrichment service
    const enrichmentService = new KeywordEnrichmentService(
      keywordBankService,
      apiClient,
      errorHandler
    );

    return { enrichmentService, integrationService };
  } catch (error) {
    console.error('Error initializing SeRanking services:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      keyword: searchParams.get('keyword'),
      country_code: searchParams.get('country_code'),
      language_code: searchParams.get('language_code'),
      force_refresh: searchParams.get('force_refresh') === 'true'
    };

    // Validate request parameters
    const validation = KeywordDataRequestSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request parameters',
        message: validation.error.errors.map(e => e.message).join(', ')
      } as KeywordDataResponse, { status: 400 });
    }

    const { keyword, country_code, language_code, force_refresh } = validation.data;

    // Initialize services
    const services = await initializeServices('system');
    if (!services) {
      return NextResponse.json({
        success: false,
        error: 'SeRanking integration not configured',
        message: 'Please configure SeRanking API credentials'
      } as KeywordDataResponse, { status: 503 });
    }

    const { enrichmentService, integrationService } = services;

    // Get integration settings to check quota
    const integrationSettings = await integrationService.getIntegrationSettings('system');
    if (!integrationSettings.success || !integrationSettings.data) {
      return NextResponse.json({
        success: false,
        error: 'Unable to check quota status',
        message: 'Please try again later'
      } as KeywordDataResponse, { status: 503 });
    }

    const quotaRemaining = integrationSettings.data.api_quota_limit - integrationSettings.data.api_quota_used;
    if (quotaRemaining <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Quota exceeded',
        message: `API quota limit reached. Resets on ${integrationSettings.data.quota_reset_date}`,
        quota_remaining: 0
      } as KeywordDataResponse, { status: 429 });
    }

    // Enrich keyword data
    const enrichmentResult = await enrichmentService.enrichKeyword(
      keyword,
      country_code,
      force_refresh
    );

    if (!enrichmentResult.success) {
      return NextResponse.json({
        success: false,
        error: enrichmentResult.error?.type || 'enrichment_failed',
        message: enrichmentResult.error?.message || 'Failed to enrich keyword data',
        quota_remaining: quotaRemaining
      } as KeywordDataResponse, { status: 500 });
    }

    const keywordData = enrichmentResult.data;
    if (!keywordData) {
      return NextResponse.json({
        success: false,
        error: 'enrichment_failed',
        message: 'No keyword data returned',
        quota_remaining: quotaRemaining
      } as KeywordDataResponse, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        keyword: keywordData.keyword,
        country_code: keywordData.country_code,
        is_data_found: keywordData.is_data_found,
        volume: keywordData.volume,
        cpc: keywordData.cpc,
        competition: keywordData.competition,
        difficulty: keywordData.difficulty,
        keyword_intent: keywordData.keyword_intent,
        history_trend: keywordData.history_trend,
        source: enrichmentResult.metadata?.source || 'api',
        last_updated: keywordData.data_updated_at.toISOString()
      },
      quota_remaining: quotaRemaining,
      cache_hit: enrichmentResult.metadata?.source === 'cache'
    } as KeywordDataResponse);

  } catch (error) {
    console.error('Error in keyword data endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: 'internal_server_error',
      message: 'An unexpected error occurred'
    } as KeywordDataResponse, { status: 500 });
  }
}