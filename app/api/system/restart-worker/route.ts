import { NextRequest, NextResponse } from 'next/server';
import { backgroundWorker } from '@/lib/job-management/background-worker';

export async function POST(request: NextRequest) {
  try {
    console.log('Manual worker restart requested');
    
    // Stop current worker
    backgroundWorker.stop();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start worker again
    backgroundWorker.start();
    
    return NextResponse.json({
      message: 'Background worker restarted successfully',
      timestamp: new Date().toISOString(),
      status: backgroundWorker.getStatus()
    });
  } catch (error) {
    console.error('Error restarting worker:', error);
    return NextResponse.json(
      { error: 'Failed to restart worker' },
      { status: 500 }
    );
  }
}