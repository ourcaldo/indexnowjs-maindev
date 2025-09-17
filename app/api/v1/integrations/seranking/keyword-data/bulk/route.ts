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
import { EnrichmentQueue } from '../../../../../../../lib/rank-tracking/seranking/services/EnrichmentQueue';

// Request validation schema
const BulkEnrichmentRequestSchema = z.object({
  keywords: z.array(z.object({
    keyword: z.string().min(1).max(500),
    country_code: z.string().regex(/^[a-z]{2}$/i).optional().default('us'),
    language_code: z.string().regex(/^[a-z]{2}$/i).optional().default('en')
  })).min(1).max(1000),
  priority: z.enum(['high', 'normal', 'low']).optional().default('normal')
  // Removed callback_url to prevent SSRF attacks until proper verification is implemented
});

// Response interface
interface BulkEnrichmentResponse {
  success: boolean;
  job_id?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  total_keywords?: number;
  estimated_completion?: string;
  quota_required?: number;
  quota_available?: number;
  error?: string;
  message?: string;
}

async function initializeServices(userId: string = 'system'): Promise<{
  enrichmentService: KeywordEnrichmentService;
  integrationService: IntegrationService;
  enrichmentQueue: EnrichmentQueue;
} | null> {
  try {
    // Initialize services
    const keywordBankService = new KeywordBankService();
    const integrationService = new IntegrationService();
    const errorHandler = new ErrorHandlingService();
    const enrichmentQueue = new EnrichmentQueue({
      maxQueueSize: 10000,
      defaultBatchSize: 25,
      jobTimeout: 300000,
      enableMetrics: true
    });

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

    return { enrichmentService, integrationService, enrichmentQueue };
  } catch (error) {
    console.error('Error initializing SeRanking services:', error);
    return null;
  }
}

function calculateEstimatedCompletion(keywordCount: number, batchSize: number = 25): string {
  // Estimate: 2 seconds per batch + 1 second per keyword for API calls
  const batchCount = Math.ceil(keywordCount / batchSize);
  const estimatedSeconds = (batchCount * 2) + keywordCount;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
  
  const completionTime = new Date();
  completionTime.setMinutes(completionTime.getMinutes() + estimatedMinutes);
  
  return completionTime.toISOString();
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

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

    // SECURITY WARNING: In production, user_id MUST be derived from authenticated session/JWT
    // NEVER trust client-provided user_id as it enables tenant impersonation and quota theft
    // TODO: Replace with: const authenticatedUserId = getAuthenticatedUserId(request);
    const systemUserId = 'system'; // Temporary - should be authenticated user ID

    // Initialize services with authenticated user
    const services = await initializeServices(systemUserId);
    if (!services) {
      return NextResponse.json({
        success: false,
        error: 'SeRanking integration not configured',
        message: 'Please configure SeRanking API credentials'
      } as BulkEnrichmentResponse, { status: 503 });
    }

    const { enrichmentService, integrationService, enrichmentQueue } = services;

    // Get integration settings to check quota for the authenticated user
    const integrationSettings = await integrationService.getIntegrationSettings(systemUserId);
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
        quota_required: quotaRequired,
        quota_available: quotaAvailable
      } as BulkEnrichmentResponse, { status: 429 });
    }

    // Create enrichment job with authenticated user
    const jobResult = await enrichmentQueue.enqueueJob({
      type: 'bulk_enrichment',
      data: {
        keywords: keywords.map(k => ({
          keyword: k.keyword,
          country_code: k.country_code,
          language_code: k.language_code
        })),
        // callback_url removed for security - will be added back with proper verification
        total_keywords: totalKeywords
      },
      priority,
      config: {
        batchSize: 25,
        maxRetries: 3,
        timeoutMs: 300000,
        enableParallel: true,
        parallelLimit: 3
      }
    }, systemUserId);

    if (!jobResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to queue enrichment job',
        message: jobResult.error || 'Unknown error occurred'
      } as BulkEnrichmentResponse, { status: 500 });
    }

    const estimatedCompletion = calculateEstimatedCompletion(totalKeywords);

    // TODO: Move quota recording to execution time in KeywordEnrichmentService/queue worker
    // Recording at enqueue time risks over/under counting and doesn't account for cache hits/failures
    // await integrationService.recordApiUsage(quotaRequired, { operationType: 'bulk_enrichment', userId: systemUserId });

    return NextResponse.json({
      success: true,
      job_id: jobResult.job_id,
      status: 'queued',
      total_keywords: totalKeywords,
      estimated_completion: estimatedCompletion,
      quota_required: quotaRequired,
      quota_available: quotaAvailable
    } as BulkEnrichmentResponse, { status: 202 });

  } catch (error) {
    console.error('Error in bulk enrichment endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: 'internal_server_error',
      message: 'An unexpected error occurred'
    } as BulkEnrichmentResponse, { status: 500 });
  }
}