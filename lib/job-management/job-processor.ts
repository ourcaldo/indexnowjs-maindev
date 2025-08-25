import { supabaseAdmin } from '../database/supabase';
import { GoogleAuthService } from '../google-services/google-auth-service';
import { WebSocketService } from '../job-management/websocket-service';

interface Job {
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
}

interface UrlSubmission {
  id: string;
  job_id: string;
  url: string;
  status: 'pending' | 'submitted' | 'indexed' | 'failed' | 'quota_exceeded';
  retry_count: number;
}

export class JobProcessor {
  private static instance: JobProcessor;
  private googleAuth: GoogleAuthService;
  private websocket: WebSocketService;
  private processingJobs = new Set<string>();

  constructor() {
    this.googleAuth = GoogleAuthService.getInstance();
    this.websocket = WebSocketService.getInstance();
  }

  static getInstance(): JobProcessor {
    if (!JobProcessor.instance) {
      JobProcessor.instance = new JobProcessor();
    }
    return JobProcessor.instance;
  }

  async processJob(jobId: string): Promise<void> {
    // Prevent multiple processing of same job
    if (this.processingJobs.has(jobId)) {
      console.log(`Job ${jobId} is already being processed`);
      return;
    }

    try {
      // Lock the job
      const lockResult = await this.lockJob(jobId);
      if (!lockResult) {
        console.log(`Failed to lock job ${jobId}`);
        return;
      }

      this.processingJobs.add(jobId);
      
      // Get job details
      const job = await this.getJobDetails(jobId);
      if (!job) {
        console.error(`Job ${jobId} not found`);
        return;
      }

      // Update job status to running
      await this.updateJobStatus(jobId, 'running', { started_at: new Date().toISOString() });
      this.websocket.broadcastJobUpdate(job.user_id, jobId, {
        status: 'running',
        progress: this.getJobProgress(job)
      });

      // Process URLs
      await this.processJobUrls(job);

      // Mark job as completed
      await this.updateJobStatus(jobId, 'completed', { 
        completed_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null
      });

      this.websocket.broadcastJobUpdate(job.user_id, jobId, {
        status: 'completed',
        progress: this.getJobProgress({ ...job, status: 'completed' })
      });

    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      
      // Mark job as failed
      await this.updateJobStatus(jobId, 'failed', { 
        error_message: error instanceof Error ? error.message : 'Unknown error',
        locked_at: null,
        locked_by: null
      });

      // Get job details for websocket update
      const job = await this.getJobDetails(jobId);
      if (job) {
        this.websocket.broadcastJobUpdate(job.user_id, jobId, {
          status: 'failed',
          progress: this.getJobProgress(job),
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  private async lockJob(jobId: string): Promise<boolean> {
    try {
      const lockTime = new Date().toISOString();
      const lockId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabaseAdmin
        .from('indb_indexing_jobs')
        .update({
          locked_at: lockTime,
          locked_by: lockId,
          status: 'running'
        })
        .eq('id', jobId)
        .or('locked_at.is.null,status.neq.running')
        .select();

      return !error && data && data.length > 0;
    } catch (error) {
      console.error('Error locking job:', error);
      return false;
    }
  }

  private async getJobDetails(jobId: string): Promise<Job | null> {
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

  private async processJobUrls(job: Job): Promise<void> {
    // Get all pending URL submissions for this job
    const { data: submissions, error } = await supabaseAdmin
      .from('indb_indexing_url_submissions')
      .select('*')
      .eq('job_id', job.id)
      .eq('status', 'pending')
      .order('created_at');

    if (error || !submissions?.length) {
      console.log(`No pending submissions found for job ${job.id}`);
      return;
    }

    // Get service account
    const serviceAccount = await this.googleAuth.getAvailableServiceAccount(job.user_id);
    if (!serviceAccount) {
      throw new Error('No available service account found');
    }

    // Process URLs in batches
    const batchSize = 10;
    for (let i = 0; i < submissions.length; i += batchSize) {
      const batch = submissions.slice(i, i + batchSize);
      await this.processBatch(job, batch, serviceAccount.id);
      
      // Update progress and broadcast to frontend
      const updatedJob = await this.getJobDetails(job.id);
      if (updatedJob) {
        this.websocket.broadcastJobUpdate(job.user_id, job.id, {
          status: 'running',
          progress: this.getJobProgress(updatedJob),
          current_url: batch[batch.length - 1]?.url
        });
      }
    }
  }

  private async processBatch(job: Job, submissions: UrlSubmission[], serviceAccountId: string): Promise<void> {
    const accessToken = await this.googleAuth.getAccessToken(serviceAccountId);
    if (!accessToken) {
      throw new Error('Failed to get access token');
    }

    for (const submission of submissions) {
      try {
        await this.submitUrlToGoogle(submission.url, accessToken);
        
        // Update submission status
        await supabaseAdmin
          .from('indb_indexing_url_submissions')
          .update({
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            service_account_id: serviceAccountId
          })
          .eq('id', submission.id);

        // Update job progress
        await this.updateJobProgress(job.id, 'successful');

      } catch (error) {
        console.error(`Error submitting URL ${submission.url}:`, error);
        
        // Update submission as failed
        await supabaseAdmin
          .from('indb_indexing_url_submissions')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Submission failed',
            retry_count: submission.retry_count + 1
          })
          .eq('id', submission.id);

        // Update job progress
        await this.updateJobProgress(job.id, 'failed');
      }
    }
  }

  private async submitUrlToGoogle(url: string, accessToken: string): Promise<void> {
    const response = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
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
      throw new Error(`Google API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
  }

  private async updateJobProgress(jobId: string, result: 'successful' | 'failed'): Promise<void> {
    try {
      const field = result === 'successful' ? 'successful_urls' : 'failed_urls';
      
      const { data } = await supabaseAdmin
        .from('indb_indexing_jobs')
        .select('processed_urls, successful_urls, failed_urls, total_urls')
        .eq('id', jobId)
        .single();

      if (data) {
        const newProcessed = data.processed_urls + 1;
        const newSuccessful = result === 'successful' ? data.successful_urls + 1 : data.successful_urls;
        const newFailed = result === 'failed' ? data.failed_urls + 1 : data.failed_urls;
        const progressPercentage = (newProcessed / data.total_urls) * 100;

        await supabaseAdmin
          .from('indb_indexing_jobs')
          .update({
            processed_urls: newProcessed,
            successful_urls: newSuccessful,
            failed_urls: newFailed,
            progress_percentage: progressPercentage
          })
          .eq('id', jobId);
      }
    } catch (error) {
      console.error('Error updating job progress:', error);
    }
  }

  private getJobProgress(job: Job) {
    return {
      total_urls: job.total_urls,
      processed_urls: job.processed_urls,
      successful_urls: job.successful_urls,
      failed_urls: job.failed_urls,
      progress_percentage: job.progress_percentage
    };
  }
}