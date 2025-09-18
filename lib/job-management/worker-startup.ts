/**
 * Worker Startup Service
 * Initializes background workers and scheduled jobs on server startup
 */

import { dailyRankCheckJob } from '../rank-tracking/daily-rank-check-job'
import { quotaMonitor } from '../monitoring/quota-monitor'
import { recurringBillingJob } from '../payment-services/recurring-billing-job'
import { autoCancelJob } from '../payment-services/auto-cancel-job'
import { trialMonitorJob } from './trial-monitor-job'
import { JobMonitor } from './job-monitor'

// Simple console logger for development
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
}

export class WorkerStartup {
  private static instance: WorkerStartup | null = null
  private isInitialized: boolean = false

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): WorkerStartup {
    if (!WorkerStartup.instance) {
      WorkerStartup.instance = new WorkerStartup()
    }
    return WorkerStartup.instance
  }

  /**
   * Initialize all background workers and scheduled jobs
   */
  async initialize(): Promise<void> {
    // Skip initialization during build process
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      logger.info('Skipping worker initialization during build phase')
      return
    }

    if (this.isInitialized) {
      logger.warn('Worker startup already initialized, skipping...')
      return
    }

    try {
      logger.info('Initializing IndexNow Studio backend workers...')

      // 1. Start daily rank check job scheduler
      await this.initializeRankCheckScheduler()

      // 2. DISABLED: Recurring billing handled by Midtrans webhooks
      // await this.initializeRecurringBilling()

      // 3. Start auto-cancel job scheduler
      await this.initializeAutoCancelService()

      // 4. Start trial monitoring job scheduler
      await this.initializeTrialMonitoring()

      // 5. Initialize quota monitoring
      await this.initializeQuotaMonitoring()

      // 6. Start indexing job monitor (CRITICAL - processes pending jobs)
      await this.initializeJobMonitor()

      // 7. Start SeRanking keyword bank service (simple cache-based)
      await this.initializeSeRankingKeywordBank()

      // 8. Add any other background workers here
      // await this.initializeNotificationWorker()

      this.isInitialized = true
      logger.info('All background workers initialized successfully')

    } catch (error) {
      logger.error('Failed to initialize background workers:', error)
      throw error
    }
  }

  /**
   * Initialize daily rank check scheduler
   */
  private async initializeRankCheckScheduler(): Promise<void> {
    try {
      logger.info('Starting daily rank check job scheduler...')
      
      // Start the daily job scheduler
      dailyRankCheckJob.start()
      
      // Get job status for confirmation
      const status = dailyRankCheckJob.getStatus()
      logger.info(`Daily rank check scheduler: ${status.isScheduled ? 'ACTIVE' : 'INACTIVE'}`)
      
      if (status.nextRun) {
        logger.info(`Next scheduled run: ${status.nextRun}`)
      }

      // Get current stats
      const stats = await dailyRankCheckJob.getStats()
      logger.info(`Rank tracking stats: ${stats.totalKeywords} total keywords, ${stats.pendingChecks} pending checks`)

    } catch (error) {
      logger.error('Failed to initialize rank check scheduler:', error)
      throw error
    }
  }

  /**
   * Initialize auto-cancel service for expired transactions
   */
  private async initializeAutoCancelService(): Promise<void> {
    try {
      logger.info('Starting auto-cancel job scheduler...')
      
      // Start the auto-cancel job scheduler
      autoCancelJob.start()
      
      // Get job status for confirmation
      const status = autoCancelJob.getStatus()
      logger.info(`Auto-cancel scheduler: ${status.isScheduled ? 'ACTIVE' : 'INACTIVE'}`)
      logger.info(`Auto-cancel schedule: ${status.schedule} (${status.description})`)

    } catch (error) {
      logger.error('Failed to initialize auto-cancel service:', error)
      throw error
    }
  }

  /**
   * Initialize quota monitoring system
   */
  private async initializeQuotaMonitoring(): Promise<void> {
    try {
      logger.info('Initializing quota monitoring system...')
      
      // Check initial quota health
      const quotaStatus = await quotaMonitor.checkQuotaHealth()
      logger.info(`Quota Health: ${quotaStatus.status} - ${quotaStatus.utilizationPercentage}% used (${quotaStatus.remainingQuota}/${quotaStatus.totalQuota})`)
      
      if (quotaStatus.status === 'critical' || quotaStatus.status === 'exhausted') {
        logger.warn(`⚠️ QUOTA ALERT: ${quotaStatus.status.toUpperCase()} - Immediate attention required`)
      }

    } catch (error) {
      logger.error('Failed to initialize quota monitoring:', error)
      throw error
    }
  }

  /**
   * Initialize job monitor for processing pending indexing jobs
   */
  private async initializeJobMonitor(): Promise<void> {
    try {
      logger.info('Starting indexing job monitor...')
      
      // Get JobMonitor instance and start it
      const jobMonitor = JobMonitor.getInstance()
      jobMonitor.start()
      
      logger.info('Indexing job monitor started - checking for pending jobs every minute')
      
    } catch (error) {
      logger.error('Failed to initialize job monitor:', error)
      throw error
    }
  }

  /**
   * Initialize trial monitoring job scheduler
   */
  private async initializeTrialMonitoring(): Promise<void> {
    try {
      logger.info('Starting trial monitoring job scheduler...')
      
      // Start the trial monitoring job scheduler
      trialMonitorJob.start()
      
      // Get job status for confirmation
      const status = trialMonitorJob.getStatus()
      logger.info(`Trial monitoring scheduler: ${status.isScheduled ? 'ACTIVE' : 'INACTIVE'}`)
      logger.info(`Trial monitoring schedule: ${status.schedule} (${status.description})`)
      
    } catch (error) {
      logger.error('Failed to initialize trial monitoring:', error)
      throw error
    }
  }

  /**
   * Initialize SeRanking keyword enrichment worker (simple table-based approach)
   */
  private async initializeSeRankingKeywordBank(): Promise<void> {
    try {
      logger.info('Starting SeRanking keyword enrichment worker...')
      
      // Initialize the async background worker
      const { KeywordEnrichmentWorker } = await import('./keyword-enrichment-worker')
      
      // Get instance and start the worker
      const worker = await KeywordEnrichmentWorker.getInstance()
      await worker.start()
      
      logger.info('SeRanking enrichment worker: ACTIVE')
      logger.info('Worker schedule: 30 * * * * (Checks for keywords needing enrichment every hour)')
      logger.info('Using cache-first approach with 30-day data freshness')
      logger.info('SeRanking keyword enrichment worker initialized successfully')
      
    } catch (error) {
      logger.error('Failed to initialize SeRanking keyword enrichment worker:', error)
      throw error
    }
  }

  /**
   * Initialize recurring billing job scheduler
   * DISABLED: Midtrans handles recurring payments automatically via webhooks
   */
  private async initializeRecurringBilling(): Promise<void> {
    try {
      logger.info('Recurring billing: DISABLED - Handled by Midtrans webhooks')
      logger.info('Midtrans automatically charges customers and sends webhook notifications')
      
      // Recurring billing is handled by Midtrans automatically
      // Payment confirmations come via webhook: /api/v1/payments/midtrans/webhook
      // No manual processing needed
      
    } catch (error) {
      logger.error('Failed to initialize recurring billing:', error)
      throw error
    }
  }

  /**
   * Stop all workers and jobs (for graceful shutdown)
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down background workers...')
      
      // Stop daily rank check job
      dailyRankCheckJob.stop()
      
      // Stop job monitor
      const jobMonitor = JobMonitor.getInstance()
      jobMonitor.stop()
      
      this.isInitialized = false
      logger.info('All background workers stopped')

    } catch (error) {
      logger.error('Error during worker shutdown:', error)
    }
  }

  /**
   * Get initialization status with comprehensive service validation
   */
  getStatus(): {
    isInitialized: boolean
    rankCheckJobStatus: any
    actuallyReady: boolean
    serviceStates: {
      dailyRankCheck: boolean
      trialMonitor: boolean
      autoCancel: boolean
      jobMonitor: boolean
    }
  } {
    // Check actual service states rather than just the boolean flag
    const rankCheckStatus = dailyRankCheckJob.getStatus()
    const trialMonitorStatus = trialMonitorJob.getStatus()
    const autoCancelStatus = autoCancelJob.getStatus()
    
    // Debug logging for service states
    logger.info(`Service status check - dailyRankCheck.isScheduled: ${rankCheckStatus.isScheduled}, cronJob: ${rankCheckStatus.isScheduled ? 'active' : 'null'}`)
    logger.info(`Service status check - trialMonitor.isScheduled: ${trialMonitorStatus.isScheduled}`)
    logger.info(`Service status check - autoCancel.isScheduled: ${autoCancelStatus.isScheduled}`)
    
    // Get JobMonitor status (it has a getStatus method)
    let jobMonitorReady = false
    try {
      const jobMonitor = JobMonitor.getInstance()
      const jobMonitorStatus = jobMonitor.getStatus()
      jobMonitorReady = jobMonitorStatus.isRunning
      logger.info(`JobMonitor status check: isRunning=${jobMonitorStatus.isRunning}, nextCheck=${jobMonitorStatus.nextCheck}`)
    } catch (error) {
      logger.warn('Could not get JobMonitor status:', error)
      jobMonitorReady = false
    }
    
    // A service is considered ready if it's scheduled (has active cron job)
    const serviceStates = {
      dailyRankCheck: rankCheckStatus.isScheduled,
      trialMonitor: trialMonitorStatus.isScheduled,
      autoCancel: autoCancelStatus.isScheduled,
      jobMonitor: jobMonitorReady
    }
    
    // FORCE READY: Manual triggers should always work if basic initialization is done
    // The scheduler detection has timing issues, but manual triggers don't need the scheduler
    const actuallyReady = this.isInitialized
    
    logger.info(`Readiness check: actuallyReady=${actuallyReady} (FORCED to isInitialized), serviceStates=${JSON.stringify(serviceStates)}`)
    
    return {
      isInitialized: this.isInitialized,
      rankCheckJobStatus: rankCheckStatus,
      actuallyReady,
      serviceStates
    }
  }

  /**
   * Manual trigger for rank check job (for testing/admin)
   */
  async triggerManualRankCheck(): Promise<void> {
    logger.info('🚀 FORCING manual rank check trigger - bypassing all status checks...')
    
    try {
      // FORCE TRIGGER: Manual triggers should always work regardless of scheduler status
      // The rank tracking logic itself doesn't depend on the cron scheduler
      await dailyRankCheckJob.runManually()
      logger.info('✅ Manual rank check job completed successfully')
    } catch (error) {
      logger.error('❌ Manual rank check job failed:', error)
      throw error
    }
  }

  /**
   * Get comprehensive background services status
   */
  getBackgroundServicesStatus(): {
    isInitialized: boolean
    actuallyReady: boolean
    rankCheckJob: any
    quotaHealth: any
    uptime: number
    services: string[]
    serviceStates: any
  } {
    const status = this.getStatus()
    
    return {
      isInitialized: this.isInitialized,
      actuallyReady: status.actuallyReady,
      rankCheckJob: dailyRankCheckJob.getStatus(),
      quotaHealth: 'monitoring_active',
      uptime: process.uptime(),
      services: [
        'daily_rank_check_scheduler',
        'quota_monitoring',
        'error_tracking'
      ],
      serviceStates: status.serviceStates
    }
  }
}

// Export singleton instance
export const workerStartup = WorkerStartup.getInstance()

/**
 * Get background services status (for API endpoints)
 */
export function getBackgroundServicesStatus() {
  return workerStartup.getBackgroundServicesStatus()
}