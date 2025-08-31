import * as cron from 'node-cron'
import { TrialMonitorService } from './trial-monitor'

// Simple console logger for development
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
}

export class TrialMonitorJob {
  private cronJob: cron.ScheduledTask | null = null
  private isRunning = false

  constructor() {
    // Don't setup job during build time
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      this.setupJob()
    }
  }

  private setupJob() {
    // Run every 15 minutes to process expired trials and check trials ending soon
    this.cronJob = cron.schedule('*/15 * * * *', async () => {
      await this.executeJob()
    })

    logger.info('Trial monitoring job scheduled to run every 15 minutes')
    logger.info('Trial monitoring scheduler: ACTIVE')
    logger.info('Next scheduled run: Every 15 minutes')
  }

  async executeJob() {
    if (this.isRunning) {
      logger.warn('Trial monitoring job already running, skipping...')
      return
    }

    this.isRunning = true
    logger.info('🔄 Starting trial monitoring job execution...')

    try {
      // Run the trial monitor service directly
      await TrialMonitorService.runTrialMonitorJob()
      logger.info('✅ Trial monitoring job completed successfully')

    } catch (error) {
      logger.error('❌ Trial monitoring job execution error:', error)
    } finally {
      this.isRunning = false
      logger.info('🏁 Trial monitoring job execution completed')
    }
  }

  start() {
    if (this.cronJob) {
      this.cronJob.start()
      logger.info('✅ Trial monitoring job started')
    }
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop()
      logger.info('⏹️ Trial monitoring job stopped')
    }
  }

  getStatus() {
    return {
      isScheduled: this.cronJob ? true : false,
      isRunning: this.isRunning,
      schedule: '*/15 * * * *',
      description: 'Processes expired trials and sends notifications every 15 minutes'
    }
  }

  // Manual trigger for testing/admin purposes
  async runManually(): Promise<void> {
    logger.info('Manually triggering trial monitoring job...')
    await this.executeJob()
  }
}

// Export singleton instance
export const trialMonitorJob = new TrialMonitorJob()