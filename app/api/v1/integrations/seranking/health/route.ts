/**
 * SeRanking Health Check API Endpoint
 * GET /api/v1/integrations/seranking/health
 * 
 * Provides comprehensive health status of SeRanking integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { IntegrationService } from '../../../../../../lib/rank-tracking/seranking/services/IntegrationService';
import { SeRankingApiClient } from '../../../../../../lib/rank-tracking/seranking/client/SeRankingApiClient';
import { KeywordBankService } from '../../../../../../lib/rank-tracking/seranking/services/KeywordBankService';
import { withSystemAuth, SystemAuthContext } from '../../../../../../lib/middleware/auth/SystemAuthMiddleware';

// Response interface
interface HealthCheckResponse {
  success: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  data?: {
    overall_status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      api_client: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        response_time?: number;
        error_message?: string;
        last_check: string;
      };
      database: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        response_time?: number;
        error_message?: string;
        last_check: string;
      };
      integration_settings: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        is_configured: boolean;
        has_api_key: boolean;
        quota_available: boolean;
        error_message?: string;
        last_check: string;
      };
      keyword_bank: {
        status: 'healthy' | 'degraded' | 'unhealthy';
        total_keywords: number;
        response_time?: number;
        error_message?: string;
        last_check: string;
      };
    };
    summary: {
      healthy_components: number;
      degraded_components: number;
      unhealthy_components: number;
      total_components: number;
    };
    recommendations?: string[];
  };
  error?: string;
  message?: string;
}

async function checkApiHealth(apiClient: SeRankingApiClient): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time?: number;
  error_message?: string;
}> {
  try {
    const startTime = Date.now();
    const healthResult = await apiClient.testConnection();
    const responseTime = Date.now() - startTime;

    if (healthResult.status === 'healthy') {
      return { status: 'healthy', response_time: responseTime };
    } else {
      return { 
        status: 'degraded', 
        response_time: responseTime, 
        error_message: healthResult.error_message 
      };
    }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error_message: error instanceof Error ? error.message : 'Unknown API error' 
    };
  }
}

async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time?: number;
  error_message?: string;
}> {
  try {
    const startTime = Date.now();
    const keywordBankService = new KeywordBankService();
    
    // Try to get cache stats as a health check
    const stats = await keywordBankService.getCacheStats();
    const responseTime = Date.now() - startTime;

    return { status: 'healthy', response_time: responseTime };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error_message: error instanceof Error ? error.message : 'Database connection failed' 
    };
  }
}

function determineOverallStatus(components: any): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(components).map((comp: any) => comp.status);
  
  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  return 'healthy';
}

function generateRecommendations(components: any): string[] {
  const recommendations: string[] = [];
  
  if (components.api_client.status === 'unhealthy') {
    recommendations.push('Check SeRanking API credentials and network connectivity');
  }
  if (components.database.status === 'unhealthy') {
    recommendations.push('Verify database connection and keyword bank schema');
  }
  if (components.integration_settings.status === 'unhealthy') {
    recommendations.push('Configure SeRanking integration settings and API key');
  }
  if (!components.integration_settings.quota_available) {
    recommendations.push('API quota limit reached - consider upgrading or waiting for reset');
  }
  if (components.keyword_bank.status === 'degraded') {
    recommendations.push('Keyword bank performance is slow - check database indexes');
  }
  
  return recommendations;
}

export async function GET(request: NextRequest) {
  try {
    const checkTime = new Date().toISOString();
    
    // Initialize services
    const integrationService = new IntegrationService();
    
    // Check integration settings
    const integrationSettings = await integrationService.getIntegrationSettings('system');
    const settingsHealth = {
      status: integrationSettings.success ? 'healthy' : 'unhealthy' as const,
      is_configured: integrationSettings.success,
      has_api_key: Boolean(integrationSettings.data?.api_key), // Check if API key exists
      quota_available: integrationSettings.success ? 
        (integrationSettings.data!.api_quota_limit - integrationSettings.data!.api_quota_used) > 0 : false,
      error_message: integrationSettings.success ? undefined : 'Integration not configured',
      last_check: checkTime
    };

    let apiClient: SeRankingApiClient | null = null;
    let apiHealth: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      response_time?: number;
      error_message?: string;
      last_check: string;
    } = { status: 'unhealthy', error_message: 'API client not initialized', last_check: checkTime };
    
    if (settingsHealth.is_configured && integrationSettings.data) {
      try {
        apiClient = new SeRankingApiClient({
          baseUrl: integrationSettings.data.api_url,
          apiKey: integrationSettings.data.api_key,
          timeout: 10000,
          retryAttempts: 1
        });
        apiHealth = { ...await checkApiHealth(apiClient), last_check: checkTime };
      } catch (error) {
        apiHealth = { 
          status: 'unhealthy', 
          error_message: 'Failed to initialize API client',
          last_check: checkTime
        };
      }
    }

    // Check database health
    const databaseHealth = { ...await checkDatabaseHealth(), last_check: checkTime };

    // Check keyword bank health
    let keywordBankHealth;
    try {
      const startTime = Date.now();
      const keywordBankService = new KeywordBankService();
      const stats = await keywordBankService.getCacheStats();
      const responseTime = Date.now() - startTime;
      
      keywordBankHealth = {
        status: 'healthy' as const,
        total_keywords: stats.total_keywords,
        response_time: responseTime,
        last_check: checkTime
      };
    } catch (error) {
      keywordBankHealth = {
        status: 'unhealthy' as const,
        total_keywords: 0,
        error_message: error instanceof Error ? error.message : 'Keyword bank unavailable',
        last_check: checkTime
      };
    }

    // Compile component statuses
    const components = {
      api_client: apiHealth,
      database: databaseHealth,
      integration_settings: settingsHealth,
      keyword_bank: keywordBankHealth
    };

    const overallStatus = determineOverallStatus(components);
    
    // Calculate summary
    const componentStatuses = Object.values(components).map(comp => comp.status);
    const summary = {
      healthy_components: componentStatuses.filter(s => s === 'healthy').length,
      degraded_components: componentStatuses.filter(s => s === 'degraded').length,
      unhealthy_components: componentStatuses.filter(s => s === 'unhealthy').length,
      total_components: componentStatuses.length
    };

    const recommendations = generateRecommendations(components);

    return NextResponse.json({
      success: true,
      status: overallStatus,
      data: {
        overall_status: overallStatus,
        components,
        summary,
        recommendations: recommendations.length > 0 ? recommendations : undefined
      }
    } as HealthCheckResponse);

  } catch (error) {
    console.error('Error in health check endpoint:', error);
    
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      error: 'health_check_failed',
      message: 'An unexpected error occurred during health check'
    } as HealthCheckResponse, { status: 500 });
  }
}