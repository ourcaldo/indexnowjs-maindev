import { backgroundWorker } from './background-worker';

/**
 * Worker Startup Module
 * 
 * Initializes background services when the application starts.
 * This should be imported and called once during app initialization.
 */

let isStarted = false;

export function startBackgroundServices(): void {
  if (isStarted) {
    // Reduced logging - only show detailed status during debug
    return;
  }

  console.log('🚀 Initializing IndexNow Pro background services...');
  
  try {
    // Start the background worker
    backgroundWorker.start();
    isStarted = true;
    
    console.log('✅ Background services started successfully');
  } catch (error) {
    console.error('❌ Failed to start background services:', error);
  }
}

export function stopBackgroundServices(): void {
  if (!isStarted) {
    console.log('Background services are not running');
    return;
  }

  console.log('🛑 Stopping IndexNow Pro background services...');
  
  try {
    backgroundWorker.stop();
    isStarted = false;
    
    console.log('✅ Background services stopped successfully');
  } catch (error) {
    console.error('❌ Failed to stop background services:', error);
  }
}

export function getBackgroundServicesStatus(): any {
  return {
    isStarted,
    worker: backgroundWorker.getStatus()
  };
}

// Auto-start in production or development
if (typeof window === 'undefined') { // Server-side only
  // Use process.nextTick to ensure modules are loaded and avoid multiple instances
  process.nextTick(() => {
    if (!(global as any).backgroundServicesStarted) {
      (global as any).backgroundServicesStarted = true;
      startBackgroundServices();
    }
  });
}