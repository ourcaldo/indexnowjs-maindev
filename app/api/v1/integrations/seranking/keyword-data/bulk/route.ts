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
  priority: z.enum(['high', 'normal', 'low']).optional().default('normal'),
  callback_url: z.string().url().optional(),
  user_id: z.string().min(1)
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

async function initializeServices(): Promise<{
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

    // Get SeRanking integration settings
    const integrationSettings = await integrationService.getIntegrationSettings('seranking_keyword_export');
    
    if (!integrationSettings.success || !integrationSettings.data) {
      console.error('SeRanking integration not configured');
      return null;
    }

    const { api_key, api_url } = integrationSettings.data;

    // Initialize API client
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

    const { keywords, priority, callback_url, user_id } = validation.data;
    const totalKeywords = keywords.length;

    // Initialize services
    const services = await initializeServices();
    if (!services) {
      return NextResponse.json({
        success: false,
        error: 'SeRanking integration not configured',
        message: 'Please configure SeRanking API credentials'
      } as BulkEnrichmentResponse, { status: 503 });
    }

    const { enrichmentService, integrationService, enrichmentQueue } = services;

    // Check quota status
    const quotaStatus = await integrationService.getQuotaStatus('seranking_keyword_export');
    if (!quotaStatus.success || !quotaStatus.data) {
      return NextResponse.json({
        success: false,
        error: 'Unable to check quota status',
        message: 'Please try again later'
      } as BulkEnrichmentResponse, { status: 503 });
    }

    const quotaRequired = totalKeywords; // Assume 1 quota per keyword
    const quotaAvailable = quotaStatus.data.remaining;

    if (quotaAvailable < quotaRequired) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient quota',
        message: `Required quota: ${quotaRequired}, Available: ${quotaAvailable}`,
        quota_required: quotaRequired,
        quota_available: quotaAvailable
      } as BulkEnrichmentResponse, { status: 429 });
    }

    // Create enrichment job
    const jobResult = await enrichmentQueue.enqueueJob({
      type: 'bulk_enrichment',
      data: {
        keywords: keywords.map(k => ({
          keyword: k.keyword,
          country_code: k.country_code,
          language_code: k.language_code
        })),
        callback_url,
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
    }, user_id);

    if (!jobResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to queue enrichment job',
        message: jobResult.error || 'Unknown error occurred'
      } as BulkEnrichmentResponse, { status: 500 });
    }

    const estimatedCompletion = calculateEstimatedCompletion(totalKeywords);

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