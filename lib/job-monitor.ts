import * as cron from 'node-cron';
import { supabaseAdmin } from './supabase';
import { SimpleJobProcessor } from './simple-job-processor';

/**
 * Job Monitor Service
 * 
 * This service runs as a background worker that:
 * 1. Monitors for pending jobs every minute
 * 2. Automatically triggers processing for pending jobs
 * 3. Handles scheduled jobs based on their next_run_at time
 * 4. Ensures only one instance processes jobs to prevent conflicts
 */
export class JobMonitor {
  private static instance: JobMonitor;
  private isRunning = false;
  private processor: SimpleJobProcessor;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.processor = SimpleJobProcessor.getInstance();
  }

  static getInstance(): JobMonitor {
    if (!JobMonitor.instance) {
      JobMonitor.instance = new JobMonitor();
    }
    return JobMonitor.instance;
  }

  /**
   * Start the job monitor
   * Runs every minute to check for pending jobs
   */
  start(): void {
    if (this.isRunning) {
      console.log('Job monitor is already running');
      return;
    }

    console.log('Starting job monitor...');
    this.isRunning = true;

    // Run every minute to check for pending jobs
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkAndProcessJobs();
    }, {
      timezone: 'UTC'
    });

    console.log('Job monitor started - checking for jobs every minute');
  }

  /**
   * Stop the job monitor
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Job monitor is not running');
      return;
    }

    console.log('Stopping job monitor...');
    this.isRunning = false;

    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }

    console.log('Job monitor stopped');
  }

  /**
   * Check for pending jobs and process them
   */
  private async checkAndProcessJobs(): Promise<void> {
    try {
      // Find pending jobs that are ready to run
      const { data: pendingJobs, error } = await supabaseAdmin
        .from('indb_indexing_jobs')
        .select('id, name, user_id, next_run_at, schedule_type')
        .eq('status', 'pending')
        .is('locked_at', null)
        .or('next_run_at.is.null,next_run_at.lte.' + new Date().toISOString())
        .limit(5); // Process max 5 jobs per minute to prevent overload

      if (error) {
        console.error('Error fetching pending jobs:', error);
        return;
      }

      if (!pendingJobs || pendingJobs.length === 0) {
        // No pending jobs found - this is normal
        return;
      }

      console.log(`Found ${pendingJobs.length} pending jobs to process`);

      // Process each job
      for (const job of pendingJobs) {
        try {
          console.log(`Processing job ${job.id} (${job.name})`);
          const result = await this.processor.processJob(job.id);
          
          if (result.success) {
            console.log(`✅ Job ${job.id} completed successfully`);
            
            // Update next run time for recurring jobs
            if (job.schedule_type && job.schedule_type !== 'one-time') {
              await this.scheduleNextRun(job.id, job.schedule_type);
            }
          } else {
            console.log(`❌ Job ${job.id} failed: ${result.error}`);
          }
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in job monitor:', error);
    }
  }

  /**
   * Schedule the next run for recurring jobs
   */
  private async scheduleNextRun(jobId: string, scheduleType: string): Promise<void> {
    try {
      const now = new Date();
      let nextRun: Date;

      switch (scheduleType) {
        case 'hourly':
          nextRun = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
          break;
        case 'daily':
          nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
          break;
        case 'weekly':
          nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +1 week
          break;
        case 'monthly':
          nextRun = new Date(now);
          nextRun.setMonth(nextRun.getMonth() + 1); // +1 month
          break;
        default:
          return; // one-time jobs don't get rescheduled
      }

      await supabaseAdmin
        .from('indb_indexing_jobs')
        .update({
          status: 'pending',
          next_run_at: nextRun.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      console.log(`📅 Job ${jobId} scheduled for next run at ${nextRun.toISOString()}`);
    } catch (error) {
      console.error(`Error scheduling next run for job ${jobId}:`, error);
    }
  }

  /**
   * Get monitor status
   */
  getStatus(): { isRunning: boolean; nextCheck?: string } {
    return {
      isRunning: this.isRunning,
      nextCheck: this.cronJob ? 'Every minute' : undefined
    };
  }

  /**
   * Manually trigger job processing (for testing)
   */
  async triggerNow(): Promise<void> {
    console.log('Manually triggering job processing...');
    await this.checkAndProcessJobs();
  }
}

// Export singleton instance
export const jobMonitor = JobMonitor.getInstance();