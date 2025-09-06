/**
 * Daily Rank Check Job
 * Scheduled job that runs daily to check keyword rankings
 */

import * as cron from 'node-cron'
import { BatchProcessor } from '../job-management/batch-processor'

// Simple console logger for development
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
}

export class DailyRankCheckJob {
  private batchProcessor: BatchProcessor
  private isRunning: boolean = false
  private cronJob: any | null = null

  constructor() {
    try {
      this.batchProcessor = new BatchProcessor()
      logger.info('DailyRankCheckJob constructor: BatchProcessor initialized successfully')
    } catch (error) {
      logger.error('DailyRankCheckJob constructor: Failed to initialize BatchProcessor:', error)
      // Set to null to handle gracefully
      this.batchProcessor = null as any
    }
  }

  /**
   * Start the daily rank check job scheduler
   */
  start(): void {
    try {
      if (!this.batchProcessor) {
        logger.error('Cannot start daily rank check job: BatchProcessor not initialized')
        return
      }

      // Run daily at 2:00 AM UTC
      this.cronJob = cron.schedule('0 2 * * *', async () => {
        await this.executeJob()
      }, {
        timezone: 'UTC'
      })

      logger.info(`Daily rank check job scheduled for 2:00 AM UTC. CronJob created: ${this.cronJob ? 'SUCCESS' : 'FAILED'}`)
      
      // Validate the cron job was created
      if (this.cronJob) {
        logger.info('✅ Daily rank check scheduler: ACTIVE')
      } else {
        logger.error('❌ Daily rank check scheduler: FAILED TO CREATE')
      }
    } catch (error) {
      logger.error('Failed to start daily rank check job:', error)
      this.cronJob = null
    }
  }

  /**
   * Stop the scheduled job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop()
      this.cronJob = null
      logger.info('Daily rank check job stopped')
    }
  }

  /**
   * Execute the daily rank check job
   */
  private async executeJob(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Daily rank check already running, skipping...')
      return
    }

    this.isRunning = true
    const startTime = Date.now()
    
    try {
      logger.info('Starting daily rank check job...')
      
      // Get initial stats
      const initialStats = await this.batchProcessor.getProcessingStats()
      logger.info(`Initial stats: ${initialStats.pendingChecks} keywords pending check`)

      // Process all keywords
      await this.batchProcessor.processDailyRankChecks()

      // Get final stats
      const finalStats = await this.batchProcessor.getProcessingStats()
      const duration = Math.round((Date.now() - startTime) / 1000)

      logger.info(`Daily rank check completed successfully in ${duration}s`)
      logger.info(`Final stats: ${finalStats.checkedToday} keywords checked today (${finalStats.completionRate}% completion rate)`)

    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000)
      logger.error(`Daily rank check failed after ${duration}s:`, error)
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Method for manual triggering (testing/admin)
   */
  async runManually(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Daily rank check already running')
    }

    logger.info('Manual rank check job triggered')
    await this.executeJob()
  }

  /**
   * Get job status
   */
  getStatus(): { 
    isScheduled: boolean
    isRunning: boolean
    nextRun: string | null
  } {
    return {
      isScheduled: this.cronJob !== null,
      isRunning: this.isRunning,
      nextRun: this.cronJob ? 'Daily at 2:00 AM UTC' : null
    }
  }

  /**
   * Get processing statistics
   */
  async getStats(): Promise<any> {
    try {
      if (!this.batchProcessor) {
        return {
          totalKeywords: 0,
          pendingChecks: 0,
          checkedToday: 0,
          completionRate: '0'
        }
      }
      return await this.batchProcessor.getProcessingStats()
    } catch (error) {
      logger.error('Failed to get processing stats:', error)
      return {
        totalKeywords: 0,
        pendingChecks: 0,
        checkedToday: 0,
        completionRate: '0'
      }
    }
  }
}

// Export singleton instance
export const dailyRankCheckJob = new DailyRankCheckJob()