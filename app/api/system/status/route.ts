import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase';
import { getBackgroundServicesStatus } from '@/lib/job-management/worker-startup';

export async function GET(request: NextRequest) {
  try {
    // Get job statistics
    const { data: jobStats, error: jobError } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .select('status')
      .order('created_at', { ascending: false })
      .limit(100);

    if (jobError) {
      console.error('Error fetching job stats:', jobError);
    }

    const stats = {
      pending: jobStats?.filter(j => j.status === 'pending').length || 0,
      running: jobStats?.filter(j => j.status === 'running').length || 0,
      completed: jobStats?.filter(j => j.status === 'completed').length || 0,
      failed: jobStats?.filter(j => j.status === 'failed').length || 0,
      total: jobStats?.length || 0
    };

    // Get background worker status
    const workerStatus = getBackgroundServicesStatus();

    return Response.json({
      system: 'IndexNow Pro',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      jobStats: stats,
      database: 'Supabase Connected',
      googleApi: 'Available',
      backgroundWorker: workerStatus
    });

  } catch (error) {
    console.error('Error getting system status:', error);
    return Response.json(
      { error: 'Failed to get system status' }, 
      { status: 500 }
    );
  }
}