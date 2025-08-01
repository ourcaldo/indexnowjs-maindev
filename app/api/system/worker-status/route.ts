import { NextRequest, NextResponse } from 'next/server';
import { getBackgroundServicesStatus } from '@/lib/worker-startup';

export async function GET(request: NextRequest) {
  try {
    const status = getBackgroundServicesStatus();
    
    return NextResponse.json({
      system: 'IndexNow Pro Background Worker',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      backgroundServices: status,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Error getting worker status:', error);
    return NextResponse.json(
      { error: 'Failed to get worker status' },
      { status: 500 }
    );
  }
}