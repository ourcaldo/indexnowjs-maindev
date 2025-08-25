import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: string;

    try {
      // For now, extract userId from token (simplified approach)
      // In production, you might want to verify with Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      userId = user.id;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Calculate dashboard statistics
    const stats = {
      totalUrlsIndexed: 0,
      activeJobs: 0,
      scheduledJobs: 0,
      successRate: 0,
      quotaUsed: 0,
      quotaLimit: 200
    };

    // Get total URLs successfully indexed
    const { data: successfulSubmissions } = await supabaseAdmin
      .from('indb_indexing_url_submissions')
      .select('count')
      .eq('status', 'submitted')
      .eq('job_id', supabaseAdmin.from('indb_indexing_jobs').select('id').eq('user_id', userId))
      .single();

    if (successfulSubmissions) {
      stats.totalUrlsIndexed = successfulSubmissions.count || 0;
    }

    // Get active and scheduled jobs
    const { data: jobs } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .select('status, schedule_type')
      .eq('user_id', userId);

    if (jobs) {
      stats.activeJobs = jobs.filter(job => job.status === 'running').length;
      stats.scheduledJobs = jobs.filter(job => 
        job.schedule_type !== 'one-time' && 
        (job.status === 'pending' || job.status === 'paused')
      ).length;
    }

    // Calculate success rate
    const { data: allSubmissions } = await supabaseAdmin
      .from('indb_indexing_url_submissions')
      .select('status')
      .eq('job_id', supabaseAdmin.from('indb_indexing_jobs').select('id').eq('user_id', userId));

    if (allSubmissions && allSubmissions.length > 0) {
      const successful = allSubmissions.filter(sub => sub.status === 'submitted').length;
      stats.successRate = (successful / allSubmissions.length) * 100;
    }

    // Get quota usage from service accounts
    const { data: quotaUsage } = await supabaseAdmin
      .from('indb_google_quota_usage')
      .select('requests_made')
      .eq('service_account_id', supabaseAdmin.from('indb_google_service_accounts').select('id').eq('user_id', userId))
      .eq('date', new Date().toISOString().split('T')[0]);

    if (quotaUsage) {
      stats.quotaUsed = quotaUsage.reduce((total, usage) => total + (usage.requests_made || 0), 0);
    }

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}