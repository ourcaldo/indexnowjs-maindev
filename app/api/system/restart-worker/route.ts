import { NextRequest, NextResponse } from 'next/server';
import { backgroundWorker } from '@/lib/job-management/background-worker';
import { requireServerSuperAdminAuth } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    // Require super admin authentication using role column from user profiles table
    await requireServerSuperAdminAuth(request);
    
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
  } catch (error: any) {
    console.error('Error restarting worker:', error);
    
    // Handle authentication errors
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to restart worker' },
      { status: 500 }
    );
  }
}