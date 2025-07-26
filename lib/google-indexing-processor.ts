import { supabaseAdmin } from './supabase';
import { GoogleAuthService } from './google-auth-service';
import { SocketIOBroadcaster } from './socketio-broadcaster';
import { JobLoggingService } from './job-logging-service';

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
 * Google Indexing Processor
 * 
 * Professional-grade URL indexing system that integrates with Google's Indexing API
 * to automatically submit URLs for indexing with proper error handling, retry logic,
 * and quota management across multiple service accounts.
 */
export class GoogleIndexingProcessor {
  private static instance: GoogleIndexingProcessor;
  private googleAuth: GoogleAuthService;
  private socketBroadcaster: SocketIOBroadcaster;
  private jobLogger: JobLoggingService;
  private processingJobs = new Set<string>();
  private rateLimitTracker: Map<string, number>;

  constructor() {
    this.googleAuth = GoogleAuthService.getInstance();
    this.socketBroadcaster = SocketIOBroadcaster.getInstance();
    this.jobLogger = JobLoggingService.getInstance();
    this.rateLimitTracker = new Map();
  }

  static getInstance(): GoogleIndexingProcessor {
    if (!GoogleIndexingProcessor.instance) {
      GoogleIndexingProcessor.instance = new GoogleIndexingProcessor();
    }
    return GoogleIndexingProcessor.instance;
  }

  /**
   * Process a complete indexing job
   * Extracts URLs, creates submissions, and processes each URL through Google's API
   */
  async processIndexingJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    if (this.processingJobs.has(jobId)) {
      return { success: false, error: 'Job is already being processed' };
    }

    try {
      // Lock the job to prevent concurrent processing
      const lockResult = await this.lockJobForProcessing(jobId);
      if (!lockResult) {
        return { success: false, error: 'Failed to lock job - may already be processing' };
      }

      this.processingJobs.add(jobId);
      console.log(`🚀 Starting indexing job ${jobId}`);
      
      // Get job details
      const job = await this.getJobDetails(jobId);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      // Log job start
      await this.jobLogger.logJobStarted(jobId, job.name, job.total_urls || 0);

      // Update job status to running
      await this.updateJobStatus(jobId, 'running', { 
        started_at: new Date().toISOString(),
        processed_urls: 0,
        successful_urls: 0,
        failed_urls: 0,
        progress_percentage: 0
      });

      // Extract URLs from job source data
      const urls = await this.extractUrlsFromJobSource(job);
      if (urls.length === 0) {
        throw new Error('No URLs found to process in job source data');
      }

      console.log(`📋 Found ${urls.length} URLs to process`);

      // Log URL extraction
      await this.jobLogger.logJobEvent({
        job_id: jobId,
        level: 'INFO',
        message: `Found ${urls.length} URLs to process`,
        metadata: {
          event_type: 'urls_extracted',
          url_count: urls.length,
          job_type: job.type
        }
      });

      // Create URL submissions for tracking
      await this.createUrlSubmissionsForJob(jobId, urls);

      // Process all URLs through Google's Indexing API
      await this.processUrlSubmissionsWithGoogleAPI(job);

      // Get final stats and check current job status
      const finalJob = await this.getJobDetails(jobId);
      const processingTimeMs = finalJob?.started_at ? new Date().getTime() - new Date(finalJob.started_at).getTime() : undefined;

      // Check if job was paused due to quota exhaustion during processing
      if (finalJob?.status === 'paused') {
        console.log(`⏸️ Job ${jobId} was paused due to quota exhaustion - not marking as completed`);
        
        // Log job pause event
        await this.jobLogger.logJobEvent({
          job_id: jobId,
          level: 'INFO',
          message: `Job paused due to service account quota exhaustion`,
          metadata: {
            event_type: 'job_paused_quota_exhausted',
            total_urls: finalJob?.total_urls || 0,
            processed_urls: finalJob?.processed_urls || 0,
            successful_urls: finalJob?.successful_urls || 0,
            failed_urls: finalJob?.failed_urls || 0,
            processing_time_ms: processingTimeMs
          }
        });

        return { success: true };
      }

      // Mark job as completed only if not paused
      await this.updateJobStatus(jobId, 'completed', { 
        completed_at: new Date().toISOString()
      });

      // Log job completion
      await this.jobLogger.logJobCompleted(jobId, job.name, {
        total_urls: finalJob?.total_urls || 0,
        successful_urls: finalJob?.successful_urls || 0,
        failed_urls: finalJob?.failed_urls || 0,
        processing_time_ms: processingTimeMs
      });

      // Send real-time completion update
      this.socketBroadcaster.broadcastJobUpdate(job.user_id, jobId, {
        status: 'completed',
        progress: {
          total_urls: finalJob?.total_urls || 0,
          processed_urls: finalJob?.processed_urls || 0,
          successful_urls: finalJob?.successful_urls || 0,
          failed_urls: finalJob?.failed_urls || 0,
          progress_percentage: 100
        }
      });

      console.log(`✅ Indexing job ${jobId} completed successfully`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Indexing job ${jobId} failed:`, error);
      
      // Get job details for logging
      const job = await this.getJobDetails(jobId);
      
      // Log job failure
      if (job) {
        await this.jobLogger.logJobFailed(jobId, job.name, error instanceof Error ? error.message : 'Unknown error', {
          error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
          stack_trace: error instanceof Error ? error.stack : undefined
        });
      }
      
      // Mark job as failed
      await this.updateJobStatus(jobId, 'failed', { 
        error_message: error instanceof Error ? error.message : 'Unknown error',
        locked_at: null,
        locked_by: null
      });

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  /**
   * Extract URLs from job source data based on job type
   */
  private async extractUrlsFromJobSource(job: IndexingJob): Promise<string[]> {
    try {
      if (job.type === 'manual') {
        // For manual jobs, URLs are stored in source_data.urls
        const urls = job.source_data?.urls || [];
        console.log(`📝 Manual job: extracted ${urls.length} URLs`);
        return urls;
      } else if (job.type === 'sitemap') {
        // For sitemap jobs, parse the sitemap URL
        const sitemapUrl = job.source_data?.sitemapUrl;
        if (!sitemapUrl) {
          throw new Error('No sitemap URL found in job source data');
        }
        console.log(`🗺️ Sitemap job: parsing ${sitemapUrl}`);
        return await this.parseSitemapUrls(sitemapUrl);
      }
      return [];
    } catch (error) {
      console.error('Error extracting URLs from job source:', error);
      throw error;
    }
  }

  /**
   * Parse sitemap XML to extract all URLs
   */
  private async parseSitemapUrls(sitemapUrl: string): Promise<string[]> {
    try {
      console.log(`🔍 Fetching sitemap: ${sitemapUrl}`);
      const response = await fetch(sitemapUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
      }

      const xmlContent = await response.text();
      const xml2js = await import('xml2js');
      const parser = new xml2js.Parser();
      const parsedXml = await parser.parseStringPromise(xmlContent);

      const urls: string[] = [];
      
      // Handle regular sitemap with URL entries
      if (parsedXml.urlset?.url) {
        parsedXml.urlset.url.forEach((urlEntry: any) => {
          if (urlEntry.loc?.[0]) {
            urls.push(urlEntry.loc[0]);
          }
        });
      }
      
      // Handle sitemap index with nested sitemaps
      if (parsedXml.sitemapindex?.sitemap) {
        for (const sitemapEntry of parsedXml.sitemapindex.sitemap) {
          if (sitemapEntry.loc?.[0]) {
            const nestedUrls = await this.parseSitemapUrls(sitemapEntry.loc[0]);
            urls.push(...nestedUrls);
          }
        }
      }

      console.log(`✅ Extracted ${urls.length} URLs from sitemap`);
      return urls;
    } catch (error) {
      console.error('Error parsing sitemap:', error);
      throw new Error(`Sitemap parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create URL submission records for tracking individual URL processing
   * PRESERVES HISTORY: Always adds new submissions, never deletes old ones
   */
  private async createUrlSubmissionsForJob(jobId: string, urls: string[]): Promise<void> {
    try {
      console.log(`📊 Creating ${urls.length} URL submission records (PRESERVING HISTORY)`);
      
      // Get existing submissions to check if this is a resume or new run
      const { data: existingSubmissions, error: countError } = await supabaseAdmin
        .from('indb_indexing_url_submissions')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at');

      if (countError) {
        console.warn('Warning: Could not fetch existing submissions, continuing with new run');
      }

      // Check job status to determine if this is a resume
      const { data: job } = await supabaseAdmin
        .from('indb_indexing_jobs')
        .select('status, processed_urls')
        .eq('id', jobId)
        .single();

      const isResume = job?.status === 'running' && existingSubmissions && existingSubmissions.length > 0;
      const pendingSubmissions = existingSubmissions?.filter(sub => sub.status === 'pending') || [];

      if (isResume && pendingSubmissions.length > 0) {
        console.log(`🔄 RESUMING job ${jobId} - found ${pendingSubmissions.length} pending submissions to continue from`);
        console.log(`📍 Job will resume from URL index ${job?.processed_urls || 0} onwards`);
        
        // For resume: don't create new submissions, use existing pending ones
        // The processing will continue from the last processed URL
        return;
      }

      // Calculate run number based on existing submissions for NEW run
      let runNumber = 1;
      if (existingSubmissions && existingSubmissions.length > 0) {
        const existingRunNumbers = existingSubmissions
          .map(sub => sub.response_data?.run_number || 1)
          .filter(num => typeof num === 'number');
        runNumber = existingRunNumbers.length > 0 ? Math.max(...existingRunNumbers) + 1 : 1;
      }

      console.log(`🔄 Creating submissions for NEW run #${runNumber} (preserving ${existingSubmissions?.length || 0} historical records)`);
      
      const submissions = urls.map((url, index) => ({
        job_id: jobId,
        url: url,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        response_data: { 
          run_number: runNumber, 
          batch_index: index,
          created_at: new Date().toISOString()
        }
      }));

      // CRITICAL: INSERT only - NEVER delete or update existing submissions
      const batchSize = 100;
      for (let i = 0; i < submissions.length; i += batchSize) {
        const batch = submissions.slice(i, i + batchSize);
        const { error } = await supabaseAdmin
          .from('indb_indexing_url_submissions')
          .insert(batch);

        if (error) {
          throw new Error(`Failed to create URL submissions: ${error.message}`);
        }
      }

      // Update job with current run info (reset progress ONLY for new runs, not resume)
      await supabaseAdmin
        .from('indb_indexing_jobs')
        .update({ 
          total_urls: urls.length,
          processed_urls: 0,
          successful_urls: 0,
          failed_urls: 0,
          progress_percentage: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      console.log(`✅ Created ${urls.length} NEW URL submission records for run #${runNumber} (total history preserved)`);
    } catch (error) {
      console.error('Error creating URL submissions:', error);
      throw error;
    }
  }

  /**
   * Process all URL submissions through Google's Indexing API
   */
  private async processUrlSubmissionsWithGoogleAPI(job: IndexingJob): Promise<void> {
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
          await this.updateQuotaUsage(serviceAccount.id, true);

          // CRITICAL: Update user's daily quota consumption
          await this.updateUserQuotaConsumption(job.user_id, 1);

          // Log successful URL processing
          await this.jobLogger.logUrlProcessed(job.id, submission.url, true, undefined, responseTime);
          const remainingQuota = await this.getRemainingQuota(serviceAccount.id);
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
          await this.updateQuotaUsage(serviceAccount.id, false);

          // CRITICAL: Update user's daily quota consumption (failed requests still consume quota)
          await this.updateUserQuotaConsumption(job.user_id, 1);

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
        await this.handleServiceAccountQuotaExhausted(serviceAccountId);
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

  /**
   * Handle service account quota exhaustion
   */
  private async handleServiceAccountQuotaExhausted(serviceAccountId: string): Promise<void> {
    try {
      // 1. Mark service account as quota exhausted
      await supabaseAdmin
        .from('indb_google_service_accounts')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceAccountId);
      
      // 2. Pause all jobs using this service account
      const { data: activeJobs } = await supabaseAdmin
        .from('indb_indexing_jobs')
        .select('id, user_id')
        .eq('status', 'running');
      
      if (activeJobs && activeJobs.length > 0) {
        // Get user_id from service account
        const { data: serviceAccount } = await supabaseAdmin
          .from('indb_google_service_accounts')
          .select('user_id')
          .eq('id', serviceAccountId)
          .single();
        
        if (serviceAccount) {
          // Pause jobs for this user
          const userJobs = activeJobs.filter(job => job.user_id === serviceAccount.user_id);
          
          for (const job of userJobs) {
            await supabaseAdmin
              .from('indb_indexing_jobs')
              .update({
                status: 'paused',
                error_message: 'Service account quota exhausted. Jobs will resume after quota reset (midnight Pacific Time).',
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
            
            console.log(`⏸️ Paused job ${job.id} due to service account quota exhaustion`);
          }
        }
      }
      
      // 3. Create quota exhausted notification
      await this.createQuotaExhaustedNotification(serviceAccountId);
      
      console.log(`🚫 Service account ${serviceAccountId} quota exhausted - jobs paused until quota reset`);
      
    } catch (error) {
      console.error('Error handling service account quota exhaustion:', error);
    }
  }

  /**
   * Create notification for quota exhausted service account
   */
  private async createQuotaExhaustedNotification(serviceAccountId: string): Promise<void> {
    try {
      // Get service account and user info
      const { data: serviceAccount } = await supabaseAdmin
        .from('indb_google_service_accounts')
        .select('user_id, name, email')
        .eq('id', serviceAccountId)
        .single();
      
      if (serviceAccount) {
        await supabaseAdmin
          .from('indb_notifications_dashboard')
          .insert({
            user_id: serviceAccount.user_id,
            type: 'service_account_quota_exhausted',
            title: 'Service Account Quota Exhausted',
            message: `Service account "${serviceAccount.name}" (${serviceAccount.email}) has exhausted its daily quota. Jobs have been paused and will resume automatically after quota reset (midnight Pacific Time).`,
            metadata: {
              service_account_id: serviceAccountId,
              service_account_name: serviceAccount.name,
              service_account_email: serviceAccount.email,
              quota_reset_time: 'midnight Pacific Time'
            },
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            created_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error creating quota exhausted notification:', error);
    }
  }

  /**
   * Update quota usage for a service account
   */
  private async updateQuotaUsage(serviceAccountId: string, successful: boolean): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get current quota usage for today
      const { data: currentUsage, error: fetchError } = await supabaseAdmin
        .from('indb_google_quota_usage')
        .select('*')
        .eq('service_account_id', serviceAccountId)
        .eq('date', today)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching current quota usage:', fetchError);
        return;
      }

      // Calculate new usage numbers
      const currentRequestsMade = currentUsage?.requests_made || 0;
      const currentRequestsSuccessful = currentUsage?.requests_successful || 0;
      const currentRequestsFailed = currentUsage?.requests_failed || 0;

      const updatedUsage = {
        service_account_id: serviceAccountId,
        date: today,
        requests_made: currentRequestsMade + 1,
        requests_successful: successful ? currentRequestsSuccessful + 1 : currentRequestsSuccessful,
        requests_failed: successful ? currentRequestsFailed : currentRequestsFailed + 1,
        last_request_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // If record doesn't exist, add created_at
      if (!currentUsage) {
        (updatedUsage as any).created_at = new Date().toISOString();
      }

      // Upsert quota usage record
      const { error: upsertError } = await supabaseAdmin
        .from('indb_google_quota_usage')
        .upsert(updatedUsage, {
          onConflict: 'service_account_id,date'
        });

      if (upsertError) {
        console.error('Error updating quota usage:', upsertError);
      } else {
        console.log(`📊 Updated quota for service account ${serviceAccountId}: ${updatedUsage.requests_made} requests (${updatedUsage.requests_successful} successful, ${updatedUsage.requests_failed} failed)`);
      }
    } catch (error) {
      console.error('Error in updateQuotaUsage:', error);
    }
  }

  /**
   * Lock job to prevent concurrent processing
   */
  private async lockJobForProcessing(jobId: string): Promise<boolean> {
    try {
      const lockTime = new Date().toISOString();
      const lockId = `processor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabaseAdmin
        .from('indb_indexing_jobs')
        .update({
          status: 'running'
        })
        .eq('id', jobId)
        .eq('status', 'pending')
        .select();

      // Send real-time status update
      if (data && data.length > 0) {
        // Get user_id from the job data
        const job = await this.getJobDetails(jobId);
        if (job) {
          this.socketBroadcaster.broadcastJobUpdate(job.user_id, jobId, {
            status: 'running',
            progress: {
              total_urls: job.total_urls,
              processed_urls: 0,
              successful_urls: 0,
              failed_urls: 0,
              progress_percentage: 0
            }
          });
        }
      }

      if (error) {
        console.error('Error locking job:', error);
        return false;
      }

      const success = data && data.length > 0;
      if (!success) {
        console.log(`Job ${jobId} is already locked or not in pending status`);
      }
      
      return success;
    } catch (error) {
      console.error('Error locking job:', error);
      return false;
    }
  }

  /**
   * Get job details from database
   */
  private async getJobDetails(jobId: string): Promise<IndexingJob | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('indb_indexing_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      return error ? null : data;
    } catch (error) {
      console.error('Error getting job details:', error);
      return null;
    }
  }

  /**
   * Update job status and additional fields
   */
  private async updateJobStatus(jobId: string, status: string, extraFields: Record<string, any> = {}): Promise<void> {
    try {
      await supabaseAdmin
        .from('indb_indexing_jobs')
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...extraFields
        })
        .eq('id', jobId);
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  }

  /**
   * Update user's daily quota consumption in user profiles table
   */
  private async updateUserQuotaConsumption(userId: string, urlCount: number): Promise<void> {
    try {
      // Get current user quota
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('daily_quota_used, daily_quota_reset_date')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching user profile for quota update:', fetchError);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const currentQuotaUsed = profile?.daily_quota_used || 0;
      const resetDate = profile?.daily_quota_reset_date;

      // Reset quota if it's a new day
      let updatedQuotaUsed = currentQuotaUsed;
      if (resetDate !== today) {
        updatedQuotaUsed = 0; // Reset for new day
      }

      // Add the consumed URLs
      updatedQuotaUsed += urlCount;

      // Update user's quota consumption
      const { error: updateError } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .update({
          daily_quota_used: updatedQuotaUsed,
          daily_quota_reset_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user quota consumption:', updateError);
      } else {
        console.log(`📊 Updated user ${userId} quota: ${updatedQuotaUsed} URLs used today`);
      }
    } catch (error) {
      console.error('Error in updateUserQuotaConsumption:', error);
    }
  }

  /**
   * Get remaining quota for a service account
   */
  private async getRemainingQuota(serviceAccountId: string): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get service account quota limit
      const { data: serviceAccount } = await supabaseAdmin
        .from('indb_google_service_accounts')
        .select('daily_quota_limit')
        .eq('id', serviceAccountId)
        .single();

      const dailyLimit = serviceAccount?.daily_quota_limit || 200; // Default Google API limit

      // Get current usage
      const { data: usage } = await supabaseAdmin
        .from('indb_google_quota_usage')
        .select('requests_made')
        .eq('service_account_id', serviceAccountId)
        .eq('date', today)
        .single();

      const usedRequests = usage?.requests_made || 0;
      return Math.max(0, dailyLimit - usedRequests);
    } catch (error) {
      console.error('Error getting remaining quota:', error);
      return 0;
    }
  }
}