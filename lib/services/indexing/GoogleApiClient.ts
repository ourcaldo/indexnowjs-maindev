import { supabaseAdmin } from '../../database/supabase';
import { GoogleAuthService } from '../../google-services/google-auth-service';
import { SocketIOBroadcaster } from '../../core/socketio-broadcaster';
import { JobLoggingService } from '../../job-management/job-logging-service';
import { QuotaManager } from './QuotaManager';

interface IndexingJob {
  id: string;
  user_id: string;
  name: string;
  type: 'manual' | 'sitemap';
  status: string;
  source_data: any;
  total_urls: number;
  processed_urls: number;
  successful_urls: number;
  failed_urls: number;
  progress_percentage: number;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface UrlSubmission {
  id: string;
  job_id: string;
  url: string;
  status: string;
  retry_count: number;
  service_account_id?: string;
  error_message?: string;
}

/**
 * Google API Client Service
 * Handles all communication with Google's Indexing API
 */
export class GoogleApiClient {
  private static instance: GoogleApiClient;
  private googleAuth: GoogleAuthService;
  private socketBroadcaster: SocketIOBroadcaster;
  private jobLogger: JobLoggingService;
  private quotaManager: QuotaManager;
  private rateLimitTracker: Map<string, number>;

  constructor() {
    this.googleAuth = GoogleAuthService.getInstance();
    this.socketBroadcaster = SocketIOBroadcaster.getInstance();
    this.jobLogger = JobLoggingService.getInstance();
    this.quotaManager = QuotaManager.getInstance();
    this.rateLimitTracker = new Map();
  }

  static getInstance(): GoogleApiClient {
    if (!GoogleApiClient.instance) {
      GoogleApiClient.instance = new GoogleApiClient();
    }
    return GoogleApiClient.instance;
  }

  /**
   * Process all URL submissions through Google's Indexing API
   */
  async processUrlSubmissionsWithGoogleAPI(job: IndexingJob): Promise<void> {
    try {
      console.log(`🔄 Processing URL submissions for job ${job.id}`);
      
      // Get active service accounts for load balancing
      const { data: serviceAccounts, error: saError } = await supabaseAdmin
        .from('indb_google_service_accounts')
        .select('*')
        .eq('user_id', job.user_id)
        .eq('is_active', true);

      if (saError || !serviceAccounts || serviceAccounts.length === 0) {
        throw new Error('No active Google service accounts found for user');
      }

      console.log(`📈 Using ${serviceAccounts.length} service accounts for load balancing`);

      // Get pending submissions for this job
      const { data: submissions, error: subError } = await supabaseAdmin
        .from('indb_indexing_url_submissions')
        .select('*')
        .eq('job_id', job.id)
        .eq('status', 'pending')
        .order('created_at');

      if (subError) {
        throw new Error(`Error fetching URL submissions: ${subError.message}`);
      }

      if (!submissions || submissions.length === 0) {
        console.log('⚠️ No pending submissions found for processing');
        return;
      }

      console.log(`🎯 Processing ${submissions.length} URL submissions`);

      let processed = 0;
      let successful = 0;
      let failed = 0;

      // Process each URL submission
      for (const submission of submissions) {
        try {
          // Check if job is still running (immediate pause/stop detection)
          const { data: currentJob } = await supabaseAdmin
            .from('indb_indexing_jobs')
            .select('status')
            .eq('id', job.id)
            .single();

          if (currentJob?.status !== 'running') {
            console.log(`🛑 Job ${job.id} was ${currentJob?.status || 'stopped'} - stopping processing immediately`);
            await this.jobLogger.logJobEvent({
              job_id: job.id,
              level: 'INFO',
              message: `Job processing stopped - status changed to ${currentJob?.status || 'unknown'}`,
              metadata: {
                processed_count: processed,
                total_submissions: submissions.length,
                stopped_at_url: submission.url
              }
            });
            break; // Stop processing immediately
          }

          // Round-robin service account selection for load balancing
          const serviceAccount = serviceAccounts[processed % serviceAccounts.length];
          
          // Log service account usage
          await this.jobLogger.logServiceAccountUsage(job.id, serviceAccount.email, 'selected_for_url_processing');
          
          // Get access token for Google API
          const accessToken = await this.googleAuth.getAccessToken(serviceAccount.id);
          if (!accessToken) {
            console.log(`⚠️ Skipping service account ${serviceAccount.id} - no valid access token (likely missing credentials)`);
            await this.jobLogger.logWarning(job.id, `Skipping service account ${serviceAccount.email} - no valid access token`, {
              service_account_id: serviceAccount.id,
              service_account_email: serviceAccount.email
            });
            continue; // Skip this service account and try the next one
          }

          // Submit URL to Google's Indexing API
          const startTime = Date.now();
          await this.submitUrlToGoogleIndexingAPI(submission.url, accessToken, serviceAccount.id);
          const responseTime = Date.now() - startTime;
          
          // Update submission as successful
          const { data: updatedSubmission } = await supabaseAdmin
            .from('indb_indexing_url_submissions')
            .update({
              status: 'submitted',
              submitted_at: new Date().toISOString(),
              service_account_id: serviceAccount.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', submission.id)
            .select()
            .single();

          // Broadcast real-time URL submission update
          if (updatedSubmission) {
            this.socketBroadcaster.broadcastUrlStatusChange(job.user_id, job.id, updatedSubmission);
          }

          // Update quota usage for the service account (-1 for successful request)
          await this.quotaManager.updateQuotaUsage(serviceAccount.id, true);

          // CRITICAL: Update user's daily quota consumption
          await this.quotaManager.updateUserQuotaConsumption(job.user_id, 1);

          // Log successful URL processing
          await this.jobLogger.logUrlProcessed(job.id, submission.url, true, undefined, responseTime);
          const remainingQuota = await this.quotaManager.getRemainingQuota(serviceAccount.id);
          await this.jobLogger.logQuotaUsage(job.id, serviceAccount.id, remainingQuota);

          successful++;
          console.log(`✅ Successfully indexed: ${submission.url}`);

        } catch (error) {
          console.error(`❌ Failed to index ${submission.url}:`, error);
          
          // Get the service account for this submission
          const serviceAccount = serviceAccounts[processed % serviceAccounts.length];
          
          // Log failed URL processing
          await this.jobLogger.logUrlProcessed(job.id, submission.url, false, error instanceof Error ? error.message : 'Unknown error');
          
          // Update submission as failed
          const { data: failedSubmission } = await supabaseAdmin
            .from('indb_indexing_url_submissions')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Indexing failed',
              retry_count: submission.retry_count + 1,
              service_account_id: serviceAccount.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', submission.id)
            .select()
            .single();

          // Broadcast real-time URL submission update
          if (failedSubmission) {
            this.socketBroadcaster.broadcastUrlStatusChange(job.user_id, job.id, failedSubmission);
          }

          // Update quota usage for the service account (still counts as a request attempt)
          await this.quotaManager.updateQuotaUsage(serviceAccount.id, false);

          // CRITICAL: Update user's daily quota consumption (failed requests still consume quota)
          await this.quotaManager.updateUserQuotaConsumption(job.user_id, 1);

          failed++;
        }

        processed++;
        
        // Update job progress in real-time
        const progressPercentage = Math.round((processed / submissions.length) * 100);
        await supabaseAdmin
          .from('indb_indexing_jobs')
          .update({
            processed_urls: processed,
            successful_urls: successful,
            failed_urls: failed,
            progress_percentage: progressPercentage,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Log progress update every 10 processed URLs or on completion
        if (processed % 10 === 0 || processed === submissions.length) {
          await this.jobLogger.logProgressUpdate(job.id, progressPercentage, processed, submissions.length);
        }

        // Send real-time progress update via Socket.io
        this.socketBroadcaster.broadcastJobUpdate(job.user_id, job.id, {
          status: 'running',
          progress: {
            total_urls: submissions.length,
            processed_urls: processed,
            successful_urls: successful,
            failed_urls: failed,
            progress_percentage: progressPercentage
          }
        });

        // Send enhanced progress broadcast with current URL info
        this.socketBroadcaster.broadcastJobProgress(job.user_id, job.id, {
          total_urls: submissions.length,
          processed_urls: processed,
          successful_urls: successful,
          failed_urls: failed,
          progress_percentage: progressPercentage
        }, submissions[processed - 1]?.url);

        // Respect Google API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`📊 Job processing complete: ${successful} successful, ${failed} failed out of ${processed} total`);

    } catch (error) {
      console.error('Error processing URL submissions:', error);
      throw error;
    }
  }

  /**
   * Submit individual URL to Google's Indexing API with rate limiting
   */
  private async submitUrlToGoogleIndexingAPI(url: string, accessToken: string, serviceAccountId: string): Promise<void> {
    // Apply rate limiting: 60 requests per minute = 1 request per second
    await this.applyRateLimit(serviceAccountId);
    
    const apiUrl = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        url: url,
        type: 'URL_UPDATED'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      
      // Check for quota exceeded error specifically
      if (errorMessage.includes('Quota exceeded') || errorMessage.includes('quota exceeded')) {
        console.log(`🚫 Service account ${serviceAccountId} quota exhausted, pausing all related jobs`);
        await this.quotaManager.handleServiceAccountQuotaExhausted(serviceAccountId);
      }
      
      throw new Error(`Google Indexing API error: ${errorMessage}`);
    }

    // Log successful response for debugging
    const responseData = await response.json();
    console.log(`🎯 Google API response for ${url}:`, responseData);
  }

  /**
   * Apply rate limiting to comply with Google's 60 requests/minute limit
   */
  private async applyRateLimit(serviceAccountId: string): Promise<void> {
    const now = Date.now();
    const key = `rate_limit_${serviceAccountId}`;
    
    // Get last request time from memory
    if (!this.rateLimitTracker) {
      this.rateLimitTracker = new Map();
    }
    
    const lastRequestTime = this.rateLimitTracker.get(key) || 0;
    const timeSinceLastRequest = now - lastRequestTime;
    
    // Ensure at least 1 second between requests (60 requests/minute)
    const minimumDelay = 1000; // 1 second
    
    if (timeSinceLastRequest < minimumDelay) {
      const delayNeeded = minimumDelay - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: waiting ${delayNeeded}ms before next request for service account ${serviceAccountId}`);
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
    
    // Update last request time
    this.rateLimitTracker.set(key, Date.now());
  }
}