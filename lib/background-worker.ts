import { jobMonitor } from './job-monitor';

/**
 * Background Worker Service
 * 
 * Manages all background services for the IndexNow Pro application:
 * - Job monitoring and processing
 * - Cleanup tasks
 * - Health checks
 */
export class BackgroundWorker {
  private static instance: BackgroundWorker;
  private isStarted = false;

  static getInstance(): BackgroundWorker {
    if (!BackgroundWorker.instance) {
      BackgroundWorker.instance = new BackgroundWorker();
    }
    return BackgroundWorker.instance;
  }

  /**
   * Start all background services
   */
  start(): void {
    if (this.isStarted) {
      console.log('Background worker is already started');
      return;
    }

    console.log('🚀 Starting IndexNow Pro background worker...');
    
    try {
      // Start job monitor
      jobMonitor.start();
      
      this.isStarted = true;
      console.log('✅ Background worker started successfully');
      
      // Log status every 5 minutes
      setInterval(() => {
        this.logStatus();
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('❌ Failed to start background worker:', error);
    }
  }

  /**
   * Stop all background services
   */
  stop(): void {
    if (!this.isStarted) {
      console.log('Background worker is not running');
      return;
    }

    console.log('🛑 Stopping background worker...');
    
    try {
      // Stop job monitor
      jobMonitor.stop();
      
      this.isStarted = false;
      console.log('✅ Background worker stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping background worker:', error);
    }
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isStarted: boolean;
    jobMonitor: any;
    uptime?: number;
  } {
    return {
      isStarted: this.isStarted,
      jobMonitor: jobMonitor.getStatus(),
      uptime: this.isStarted ? process.uptime() : undefined
    };
  }

  /**
   * Log current status
   */
  private logStatus(): void {
    const status = this.getStatus();
    console.log('📊 Background Worker Status:', {
      isStarted: status.isStarted,
      jobMonitor: status.jobMonitor.isRunning,
      uptime: status.uptime ? `${Math.round(status.uptime / 60)} minutes` : 'N/A'
    });
  }
}

// Export singleton instance
export const backgroundWorker = BackgroundWorker.getInstance();