import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireServerSuperAdminAuth, adminAuthService } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    await requireServerSuperAdminAuth()

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')

    // Calculate date filter
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - days)

    // Fetch activity logs with admin profile data
    const { data: logs, error } = await supabaseAdmin
      .from('indb_admin_activity_logs')
      .select(`
        *,
        admin_profile:admin_id (
          full_name,
          auth_users:user_id (
            email
          )
        )
      `)
      .gte('created_at', dateFilter.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Error fetching activity logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activity logs' },
        { status: 500 }
      )
    }

    // Transform the data to flatten admin profile data
    const transformedLogs = logs?.map(log => ({
      ...log,
      admin_name: log.admin_profile?.full_name,
      admin_email: log.admin_profile?.auth_users?.email,
      admin_profile: undefined // Remove nested object
    })) || []

    // Log admin activity
    await adminAuthService.logAdminActivity(
      'system_monitoring',
      'Viewed activity logs',
      'activity_logs',
      undefined,
      { days, count: transformedLogs.length }
    )

    return NextResponse.json({ 
      success: true, 
      logs: transformedLogs 
    })

  } catch (error: any) {
    console.error('Admin activity logs API error:', error)
    
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