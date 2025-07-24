import { NextRequest, NextResponse } from 'next/server';
import { SocketIOBroadcaster } from '@/lib/socketio-broadcaster';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, jobId, testType } = body;

    if (!userId || !jobId) {
      return NextResponse.json(
        { error: 'Missing userId or jobId' },
        { status: 400 }
      );
    }

    const broadcaster = SocketIOBroadcaster.getInstance();
    
    // Test different types of broadcasts
    switch (testType) {
      case 'job_update':
        broadcaster.broadcastJobUpdate(userId, jobId, {
          status: 'running',
          progress: {
            total_urls: 100,
            processed_urls: 50,
            successful_urls: 45,
            failed_urls: 5,
            progress_percentage: 50
          },
          current_url: 'https://test-url.com'
        });
        break;
        
      case 'job_progress':
        broadcaster.broadcastJobProgress(userId, jobId, {
          total_urls: 100,
          processed_urls: 75,
          successful_urls: 70,
          failed_urls: 5,
          progress_percentage: 75
        }, 'https://test-progress.com');
        break;
        
      case 'url_status':
        broadcaster.broadcastUrlStatusChange(userId, jobId, {
          id: 'test-submission-id',
          url: 'https://test-submission.com',
          status: 'submitted',
          submitted_at: new Date().toISOString()
        });
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid testType. Use: job_update, job_progress, or url_status' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${testType} broadcast sent successfully`,
      targetUserId: userId,
      targetJobId: jobId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing WebSocket broadcast:', error);
    return NextResponse.json(
      { error: 'Failed to test WebSocket broadcast' },
      { status: 500 }
    );
  }
}