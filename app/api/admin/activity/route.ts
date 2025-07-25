import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireServerSuperAdminAuth } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    await requireServerSuperAdminAuth()

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')

    // Calculate date filter
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - days)

    // Fetch activity logs
    const { data: logs, error } = await supabaseAdmin
      .from('indb_admin_activity_logs')
      .select('*')
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

    // Get admin profiles for each log to include admin name/email
    const logsWithAdminData = []
    
    for (const log of logs || []) {
      try {
        const { data: adminProfile, error: profileError } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('full_name, user_id')
          .eq('user_id', log.admin_id)
          .single()

        let adminEmail = null
        if (!profileError && adminProfile) {
          try {
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(adminProfile.user_id)
            if (!authError && authUser?.user) {
              adminEmail = authUser.user.email
            }
          } catch (authFetchError) {
            console.error(`Failed to fetch auth data for admin ${log.admin_id}:`, authFetchError)
          }
        }

        logsWithAdminData.push({
          ...log,
          admin_name: adminProfile?.full_name || 'Unknown Admin',
          admin_email: adminEmail || 'Unknown Email'
        })
      } catch (fetchError) {
        console.error(`Failed to fetch admin data for log ${log.id}:`, fetchError)
        logsWithAdminData.push({
          ...log,
          admin_name: 'Unknown Admin',
          admin_email: 'Unknown Email'
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      logs: logsWithAdminData 
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