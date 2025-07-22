import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get basic job statistics
    const { data: jobStats, error: jobStatsError } = await supabase
      .from('indb_indexing_jobs')
      .select('status, total_urls, processed_urls, successful_urls, failed_urls')
      .eq('user_id', user.id)

    if (jobStatsError) {
      return NextResponse.json(
        { error: 'Failed to fetch job statistics' },
        { status: 500 }
      )
    }

    // Calculate aggregated stats
    const stats = {
      total_jobs: jobStats?.length || 0,
      active_jobs: jobStats?.filter(j => j.status === 'running').length || 0,
      completed_jobs: jobStats?.filter(j => j.status === 'completed').length || 0,
      failed_jobs: jobStats?.filter(j => j.status === 'failed').length || 0,
      pending_jobs: jobStats?.filter(j => j.status === 'pending').length || 0,
      total_urls_indexed: jobStats?.reduce((sum, job) => sum + (job.successful_urls || 0), 0) || 0,
      total_urls_failed: jobStats?.reduce((sum, job) => sum + (job.failed_urls || 0), 0) || 0,
      total_urls_processed: jobStats?.reduce((sum, job) => sum + (job.processed_urls || 0), 0) || 0,
      total_urls_submitted: jobStats?.reduce((sum, job) => sum + (job.total_urls || 0), 0) || 0,
    }

    // Calculate success rate
    const success_rate = stats.total_urls_processed > 0 
      ? ((stats.total_urls_indexed / stats.total_urls_processed) * 100).toFixed(1)
      : '0.0'

    // Get quota usage from service accounts
    const today = new Date().toISOString().split('T')[0]
    const { data: quotaData, error: quotaError } = await supabase
      .from('indb_google_quota_usage')
      .select('requests_made')
      .eq('date', today)
      .in('service_account_id', 
        supabase
          .from('indb_google_service_accounts')
          .select('id')
          .eq('user_id', user.id)
      )

    const total_quota_used = quotaData?.reduce((sum, usage) => sum + (usage.requests_made || 0), 0) || 0

    // Get recent activity (last 5 jobs)
    const { data: recentJobs, error: recentJobsError } = await supabase
      .from('indb_indexing_jobs')
      .select('id, name, status, successful_urls, total_urls, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      stats: {
        ...stats,
        success_rate: parseFloat(success_rate),
        quota_usage: total_quota_used,
      },
      recent_activity: recentJobs || [],
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}