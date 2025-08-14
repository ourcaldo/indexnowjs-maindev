/**
 * Worker Startup Service
 * Initializes background workers and scheduled jobs on server startup
 */

import { dailyRankCheckJob } from './daily-rank-check-job'
import { quotaMonitor } from './quota-monitor'

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
    if (this.isInitialized) {
      logger.warn('Worker startup already initialized, skipping...')
      return
    }

    try {
      logger.info('Initializing IndexNow Pro backend workers...')

      // 1. Start daily rank check job scheduler
      await this.initializeRankCheckScheduler()

      // 2. Initialize quota monitoring
      await this.initializeQuotaMonitoring()

      // 3. Add any other background workers here
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
   * Stop all workers and jobs (for graceful shutdown)
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down background workers...')
      
      // Stop daily rank check job
      dailyRankCheckJob.stop()
      
      this.isInitialized = false
      logger.info('All background workers stopped')

    } catch (error) {
      logger.error('Error during worker shutdown:', error)
    }
  }

  /**
   * Get initialization status
   */
  getStatus(): {
    isInitialized: boolean
    rankCheckJobStatus: any
  } {
    return {
      isInitialized: this.isInitialized,
      rankCheckJobStatus: dailyRankCheckJob.getStatus()
    }
  }

  /**
   * Manual trigger for rank check job (for testing/admin)
   */
  async triggerManualRankCheck(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Workers not initialized. Call initialize() first.')
    }

    logger.info('Manually triggering rank check job...')
    await dailyRankCheckJob.runManually()
  }

  /**
   * Get comprehensive background services status
   */
  getBackgroundServicesStatus(): {
    isInitialized: boolean
    rankCheckJob: any
    quotaHealth: any
    uptime: number
    services: string[]
  } {
    return {
      isInitialized: this.isInitialized,
      rankCheckJob: dailyRankCheckJob.getStatus(),
      quotaHealth: 'monitoring_active',
      uptime: process.uptime(),
      services: [
        'daily_rank_check_scheduler',
        'quota_monitoring',
        'error_tracking'
      ]
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