import { JobMonitor } from '../lib/job-monitor';

export class BackgroundServices {
  private static instance: BackgroundServices;
  private jobMonitor: JobMonitor;
  private isInitialized = false;

  constructor() {
    this.jobMonitor = JobMonitor.getInstance();
  }

  static getInstance(): BackgroundServices {
    if (!BackgroundServices.instance) {
      BackgroundServices.instance = new BackgroundServices();
    }
    return BackgroundServices.instance;
  }

  initialize(): void {
    if (this.isInitialized) {
      console.log('Background services already initialized');
      return;
    }

    console.log('Initializing background services...');

    // Start job monitoring (Socket.io is handled by Next.js API routes)
    this.jobMonitor.start();

    this.isInitialized = true;
    console.log('Background services initialized successfully');
  }

  shutdown(): void {
    if (!this.isInitialized) return;

    console.log('Shutting down background services...');
    
    this.jobMonitor.stop();
    this.isInitialized = false;
    
    console.log('Background services stopped');
  }

  getStatus() {
    return {
      initialized: this.isInitialized
    };
  }
}