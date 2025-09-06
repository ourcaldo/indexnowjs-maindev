import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundServicesStatus } from '@/lib/job-management/worker-startup';
import { requireServerAdminAuth } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication to access worker status
    await requireServerAdminAuth(request);
    const status = getBackgroundServicesStatus();
    
    return NextResponse.json({
      system: 'IndexNow Studio Background Worker',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      backgroundServices: status,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error: any) {
    console.error('Error getting worker status:', error);
    
    // Handle authentication errors
    if (error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get worker status' },
      { status: 500 }
    );
  }
}