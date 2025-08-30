import * as cron from 'node-cron'

// Simple console logger for development
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
}

export class RecurringBillingJob {
  private cronJob: cron.ScheduledTask | null = null
  private isRunning = false

  constructor() {
    this.setupJob()
  }

  private setupJob() {
    // Run daily at 6:00 AM UTC to process recurring payments
    this.cronJob = cron.schedule('0 6 * * *', async () => {
      await this.executeJob()
    })

    logger.info('Recurring billing job scheduled for 6:00 AM UTC')
    logger.info('Recurring billing scheduler: ACTIVE')
    logger.info('Next scheduled run: Daily at 6:00 AM UTC')
  }

  async executeJob() {
    if (this.isRunning) {
      logger.warn('Recurring billing job already running, skipping...')
      return
    }

    this.isRunning = true
    logger.info('🔄 Starting recurring billing job execution...')

    try {
      // Call the recurring payment processing endpoint
      const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5000'
      const response = await globalThis.fetch(`${apiUrl}/api/v1/billing/midtrans/process-recurring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SYSTEM_API_KEY || 'system'}`
        }
      })

      const result = await response.json() as {
        processed?: number
        failed?: number
        error?: string
      }

      if (response.ok) {
        logger.info(`✅ Recurring billing completed: ${result.processed || 0} processed, ${result.failed || 0} failed`)
        if ((result.processed || 0) > 0) {
          logger.info(`💳 Successfully renewed ${result.processed} subscriptions`)
        }
        if ((result.failed || 0) > 0) {
          logger.warn(`⚠️ Failed to renew ${result.failed} subscriptions`)
        }
      } else {
        logger.error('❌ Recurring billing job failed:', result.error)
      }

    } catch (error) {
      logger.error('❌ Recurring billing job execution error:', error)
    } finally {
      this.isRunning = false
      logger.info('🏁 Recurring billing job execution completed')
    }
  }

  start() {
    if (this.cronJob) {
      this.cronJob.start()
      logger.info('✅ Recurring billing job started')
    }
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop()
      logger.info('⏹️ Recurring billing job stopped')
    }
  }

  getStatus() {
    return {
      isScheduled: !!this.cronJob,
      isRunning: this.isRunning,
      schedule: '0 6 * * *', // Daily at 6:00 AM UTC
      description: 'Processes recurring payments for active subscriptions'
    }
  }

  // Manual trigger for testing
  async triggerManually() {
    logger.info('🧪 Manually triggering recurring billing job...')
    await this.executeJob()
  }
}

// Singleton instance
export const recurringBillingJob = new RecurringBillingJob()