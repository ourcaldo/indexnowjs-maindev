import cron from 'node-cron';
import { supabaseAdmin } from './supabase';
import { JobProcessor } from './job-processor';

export class JobMonitor {
  private static instance: JobMonitor;
  private jobProcessor: JobProcessor;
  private isRunning = false;

  constructor() {
    this.jobProcessor = JobProcessor.getInstance();
  }

  static getInstance(): JobMonitor {
    if (!JobMonitor.instance) {
      JobMonitor.instance = new JobMonitor();
    }
    return JobMonitor.instance;
  }

  start(): void {
    if (this.isRunning) {
      console.log('Job monitor is already running');
      return;
    }

    console.log('Starting job monitor...');
    this.isRunning = true;

    // Monitor for pending jobs every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.checkPendingJobs();
      } catch (error) {
        console.error('Error in job monitor:', error);
      }
    });

    // Monitor for scheduled jobs every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.checkScheduledJobs();
      } catch (error) {
        console.error('Error checking scheduled jobs:', error);
      }
    });

    // Clean up stale locks every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await this.cleanupStaleLocks();
      } catch (error) {
        console.error('Error cleaning up stale locks:', error);
      }
    });

    console.log('Job monitor started successfully');
  }

  stop(): void {
    this.isRunning = false;
    console.log('Job monitor stopped');
  }

  private async checkPendingJobs(): Promise<void> {
    try {
      // Find pending jobs that are not locked
      const { data: pendingJobs, error } = await supabaseAdmin
        .from('indb_indexing_jobs')
        .select('id, name')
        .eq('status', 'pending')
        .is('locked_at', null)
        .order('created_at')
        .limit(5); // Process max 5 jobs per minute to avoid overwhelming

      if (error) {
        console.error('Error fetching pending jobs:', error);
        return;
      }

      if (pendingJobs?.length > 0) {
        console.log(`Found ${pendingJobs.length} pending jobs to process`);
        
        // Process jobs in parallel but with some delay to avoid race conditions
        for (let i = 0; i < pendingJobs.length; i++) {
          setTimeout(() => {
            this.jobProcessor.processJob(pendingJobs[i].id);
          }, i * 100); // 100ms delay between job starts
        }
      }
    } catch (error) {
      console.error('Error in checkPendingJobs:', error);
    }
  }

  private async checkScheduledJobs(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Find scheduled jobs that are due to run
      const { data: scheduledJobs, error } = await supabaseAdmin
        .from('indb_indexing_jobs')
        .select('id, name, schedule_type, cron_expression')
        .eq('status', 'scheduled')
        .lte('next_run_at', now)
        .is('locked_at', null)
        .order('next_run_at')
        .limit(10);

      if (error) {
        console.error('Error fetching scheduled jobs:', error);
        return;
      }

      if (scheduledJobs?.length > 0) {
        console.log(`Found ${scheduledJobs.length} scheduled jobs ready to run`);

        for (const job of scheduledJobs) {
          try {
            // Update job status to pending and calculate next run time
            const nextRunAt = this.calculateNextRunTime(job.schedule_type, job.cron_expression);
            
            await supabaseAdmin
              .from('indb_indexing_jobs')
              .update({
                status: 'pending',
                next_run_at: nextRunAt,
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);

            console.log(`Scheduled job ${job.name} (${job.id}) moved to pending`);
          } catch (error) {
            console.error(`Error updating scheduled job ${job.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error in checkScheduledJobs:', error);
    }
  }

  private async cleanupStaleLocks(): Promise<void> {
    try {
      // Clean up locks older than 30 minutes (assume stale)
      const staleTime = new Date();
      staleTime.setMinutes(staleTime.getMinutes() - 30);

      const { data, error } = await supabaseAdmin
        .from('indb_indexing_jobs')
        .update({
          locked_at: null,
          locked_by: null,
          status: 'failed',
          error_message: 'Job lock timed out - process may have crashed'
        })
        .eq('status', 'running')
        .not('locked_at', 'is', null)
        .lt('locked_at', staleTime.toISOString())
        .select('id, name');

      if (error) {
        console.error('Error cleaning up stale locks:', error);
        return;
      }

      if (data?.length > 0) {
        console.log(`Cleaned up ${data.length} stale job locks`);
        data.forEach(job => {
          console.log(`  - Job ${job.name} (${job.id})`);
        });
      }
    } catch (error) {
      console.error('Error in cleanupStaleLocks:', error);
    }
  }

  private calculateNextRunTime(scheduleType: string, cronExpression?: string): string | null {
    const now = new Date();

    switch (scheduleType) {
      case 'hourly':
        now.setHours(now.getHours() + 1);
        return now.toISOString();
        
      case 'daily':
        now.setDate(now.getDate() + 1);
        return now.toISOString();
        
      case 'weekly':
        now.setDate(now.getDate() + 7);
        return now.toISOString();
        
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        return now.toISOString();
        
      case 'custom':
        if (cronExpression) {
          // For now, return next hour - implement proper cron parsing later
          now.setHours(now.getHours() + 1);
          return now.toISOString();
        }
        return null;
        
      case 'one-time':
      default:
        return null; // One-time jobs don't repeat
    }
  }

  // Manual trigger for testing
  async triggerJobCheck(): Promise<void> {
    console.log('Manually triggering job check...');
    await this.checkPendingJobs();
    await this.checkScheduledJobs();
  }
}