import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdminAuth } from '@/lib/admin-auth'
import { ActivityLogger, ActivityEventTypes } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    const authResult = await requireSuperAdminAuth(request)
    
    // Log admin dashboard access
    if (authResult?.id) {
      try {
        await ActivityLogger.logAdminDashboardActivity(
          authResult.id,
          ActivityEventTypes.ADMIN_DASHBOARD_VIEW,
          'Accessed admin dashboard overview with system statistics',
          request,
          {
            section: 'dashboard_overview',
            action: 'view_stats',
            adminEmail: authResult.email
          }
        )
      } catch (logError) {
        console.error('Failed to log admin dashboard activity:', logError)
      }
    }

    // Fetch dashboard stats from the view
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('admin_dashboard_stats')
      .select('*')
      .single()

    if (statsError) {
      console.error('Error fetching dashboard stats:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch dashboard statistics' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      stats: stats 
    })

  } catch (error: any) {
    console.error('Admin dashboard API error:', error)
    
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}