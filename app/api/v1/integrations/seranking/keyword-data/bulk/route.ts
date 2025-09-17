/**
 * SeRanking Bulk Keyword Enrichment API Endpoint  
 * POST /api/v1/integrations/seranking/keyword-data/bulk
 * 
 * Handles bulk keyword enrichment with queue-based processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { KeywordEnrichmentService } from '../../../../../../../lib/rank-tracking/seranking/services/KeywordEnrichmentService';
import { KeywordBankService } from '../../../../../../../lib/rank-tracking/seranking/services/KeywordBankService';
import { IntegrationService } from '../../../../../../../lib/rank-tracking/seranking/services/IntegrationService';
import { SeRankingApiClient } from '../../../../../../../lib/rank-tracking/seranking/client/SeRankingApiClient';
import { ErrorHandlingService } from '../../../../../../../lib/rank-tracking/seranking/services/ErrorHandlingService';
import { withSystemAuth, SystemAuthContext } from '../../../../../../../lib/middleware/auth/SystemAuthMiddleware';

// Request validation schema
const BulkEnrichmentRequestSchema = z.object({
  keywords: z.array(z.object({
    keyword: z.string().min(1).max(500),
    country_code: z.string().regex(/^[a-z]{2}$/i).optional().default('us'),
    language_code: z.string().regex(/^[a-z]{2}$/i).optional().default('en')
  })).min(1).max(1000),
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).optional().default('NORMAL')
  // Removed callback_url to prevent SSRF attacks until proper verification is implemented
});

// Response interface
interface BulkEnrichmentResponse {
  success: boolean;
  results?: Array<{
    keyword: string;
    country_code: string;
    success: boolean;
    data?: {
      volume: number | null;
      cpc: number | null;
      competition: number | null;
      difficulty: number | null;
      keyword_intent: string | null;
      history_trend: Record<string, number> | null;
      source: 'cache' | 'api';
      last_updated: string;
    };
    error?: string;
  }>;
  total_keywords?: number;
  successful?: number;
  failed?: number;
  quota_used?: number;
  quota_available?: number;
  error?: string;
  message?: string;
}

async function initializeServices(authContext: SystemAuthContext): Promise<{
  enrichmentService: KeywordEnrichmentService;
  integrationService: IntegrationService;
} | null> {
  const userId = authContext.userId || 'system';
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

    const { api_key, api_url } = integrationSettings.data;
    
    // Validate API key exists before proceeding
    if (!api_key || api_key.trim() === '') {
      console.error('SeRanking API key not configured');
      return null;
    }

    // Initialize API client with stored API key
    const apiClient = new SeRankingApiClient({
      baseUrl: api_url,
      apiKey: api_key,
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


async function handleBulkEnrichmentRequest(request: NextRequest, authContext: SystemAuthContext): Promise<Response> {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        message: 'Request body must be valid JSON'
      } as BulkEnrichmentResponse, { status: 400 });
    }

    // Check if body is empty or not an object
    if (!body || typeof body !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        message: 'Request body must be a JSON object'
      } as BulkEnrichmentResponse, { status: 400 });
    }

    // Validate request
    const validation = BulkEnrichmentRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request parameters',
        message: validation.error.errors.map(e => e.message).join(', ')
      } as BulkEnrichmentResponse, { status: 400 });
    }

    const { keywords, priority } = validation.data;
    const totalKeywords = keywords.length;

    // Initialize services with authenticated context
    const services = await initializeServices(authContext);
    if (!services) {
      return NextResponse.json({
        success: false,
        error: 'SeRanking integration not configured',
        message: 'Please configure SeRanking API credentials'
      } as BulkEnrichmentResponse, { status: 503 });
    }

    const { enrichmentService, integrationService } = services;

    // Get integration settings to check quota for the authenticated user
    const integrationSettings = await integrationService.getIntegrationSettings(authContext.userId || 'system');
    if (!integrationSettings.success || !integrationSettings.data) {
      return NextResponse.json({
        success: false,
        error: 'Unable to check quota status',
        message: 'Please try again later'
      } as BulkEnrichmentResponse, { status: 503 });
    }

    const quotaRequired = totalKeywords; // Assume 1 quota per keyword
    const quotaAvailable = integrationSettings.data.api_quota_limit - integrationSettings.data.api_quota_used;

    if (quotaAvailable < quotaRequired) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient quota',
        message: `Required quota: ${quotaRequired}, Available: ${quotaAvailable}`,
        quota_available: quotaAvailable
      } as BulkEnrichmentResponse, { status: 429 });
    }

    // Process each keyword synchronously using the enrichment service
    const results = [];
    let quotaUsed = 0;
    let successful = 0;
    let failed = 0;

    for (const keywordRequest of keywords) {
      try {
        const result = await enrichmentService.enrichKeyword(
          keywordRequest.keyword,
          keywordRequest.country_code,
          false // Don't force refresh, use cache-first strategy
        );

        if (result.success && result.data) {
          results.push({
            keyword: keywordRequest.keyword,
            country_code: keywordRequest.country_code,
            success: true,
            data: {
              volume: result.data.volume,
              cpc: result.data.cpc,
              competition: result.data.competition,
              difficulty: result.data.difficulty,
              keyword_intent: result.data.keyword_intent,
              history_trend: result.data.history_trend,
              source: result.metadata?.source as 'cache' | 'api' || 'api',
              last_updated: result.data.data_updated_at?.toISOString() || new Date().toISOString()
            }
          });
          successful++;
          
          // Count quota usage (only for API calls, not cache hits)
          if (result.metadata?.source === 'api') {
            quotaUsed++;
          }
        } else {
          results.push({
            keyword: keywordRequest.keyword,
            country_code: keywordRequest.country_code,
            success: false,
            error: result.error?.message || 'Unknown error'
          });
          failed++;
        }
      } catch (error) {
        console.error(`Error processing keyword ${keywordRequest.keyword}:`, error);
        results.push({
          keyword: keywordRequest.keyword,
          country_code: keywordRequest.country_code,
          success: false,
          error: 'Processing error'
        });
        failed++;
      }
    }

    // Update quota usage if any API calls were made
    if (quotaUsed > 0) {
      try {
        await integrationService.recordApiUsage(quotaUsed, { 
          operationType: 'bulk_enrichment', 
          userId: authContext.userId || 'system' 
        });
      } catch (error) {
        console.error('Failed to record quota usage:', error);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      total_keywords: totalKeywords,
      successful,
      failed,
      quota_used: quotaUsed,
      quota_available: quotaAvailable - quotaUsed
    } as BulkEnrichmentResponse, { status: 200 });

  } catch (error) {
    console.error('Error in bulk enrichment endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: 'internal_server_error',
      message: 'An unexpected error occurred'
    } as BulkEnrichmentResponse, { status: 500 });
  }
}

// Export wrapped with system authentication middleware
export const POST = withSystemAuth(handleBulkEnrichmentRequest);