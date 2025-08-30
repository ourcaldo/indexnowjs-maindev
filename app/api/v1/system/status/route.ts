import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    await requireSuperAdminAuth(request)

    // Get system statistics
    const [usersCount, jobsCount, serviceAccountsCount] = await Promise.all([
      supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('user_id', { count: 'exact' }),
      supabaseAdmin
        .from('indb_indexing_jobs')
        .select('id', { count: 'exact' }),
      supabaseAdmin
        .from('indb_indexing_service_accounts')
        .select('id', { count: 'exact' })
    ])

    // Get recent activity count (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { data: recentActivity, error: activityError } = await supabaseAdmin
      .from('indb_security_activity_logs')
      .select('id', { count: 'exact' })
      .gte('created_at', yesterday.toISOString())

    return NextResponse.json({
      system: {
        status: 'operational',
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        node_version: process.version,
        platform: process.platform
      },
      database: {
        status: 'connected',
        total_users: usersCount.count || 0,
        total_jobs: jobsCount.count || 0,
        total_service_accounts: serviceAccountsCount.count || 0,
        recent_activity_24h: recentActivity?.length || 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('System status error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch system status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}