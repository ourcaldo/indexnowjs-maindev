import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

// GET /api/v1/admin/users/[id]/api-stats - Get user's API call statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require super admin authentication
    const adminUser = await requireSuperAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const { id: userId } = await params

    // Get user's service accounts first
    const { data: serviceAccounts } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select('id')
      .eq('user_id', userId)

    if (!serviceAccounts || serviceAccounts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        stats: {
          total_calls: 0,
          successful_calls: 0,
          failed_calls: 0,
          success_rate: 0,
          last_7_days: 0,
          today: 0
        }
      })
    }

    const serviceAccountIds = serviceAccounts.map(acc => acc.id)

    // Get date ranges
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    // Get all-time stats
    const { data: allTimeStats } = await supabaseAdmin
      .from('indb_google_quota_usage')
      .select('requests_made, requests_successful, requests_failed')
      .in('service_account_id', serviceAccountIds)

    // Get last 7 days stats
    const { data: last7DaysStats } = await supabaseAdmin
      .from('indb_google_quota_usage')
      .select('requests_made')
      .in('service_account_id', serviceAccountIds)
      .gte('date', sevenDaysAgoStr)

    // Get today's stats
    const { data: todayStats } = await supabaseAdmin
      .from('indb_google_quota_usage')
      .select('requests_made')
      .in('service_account_id', serviceAccountIds)
      .eq('date', today)

    // Calculate totals
    const totalCalls = allTimeStats?.reduce((sum, stat) => sum + (stat.requests_made || 0), 0) || 0
    const successfulCalls = allTimeStats?.reduce((sum, stat) => sum + (stat.requests_successful || 0), 0) || 0
    const failedCalls = allTimeStats?.reduce((sum, stat) => sum + (stat.requests_failed || 0), 0) || 0
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0

    const last7DaysTotal = last7DaysStats?.reduce((sum, stat) => sum + (stat.requests_made || 0), 0) || 0
    const todayTotal = todayStats?.reduce((sum, stat) => sum + (stat.requests_made || 0), 0) || 0

    const stats = {
      total_calls: totalCalls,
      successful_calls: successfulCalls,
      failed_calls: failedCalls,
      success_rate: successRate,
      last_7_days: last7DaysTotal,
      today: todayTotal
    }

    return NextResponse.json({ 
      success: true, 
      stats 
    })

  } catch (error: any) {
    console.error('API stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}