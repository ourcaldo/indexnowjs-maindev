import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdminAuth } from '@/lib/admin-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify super admin authentication
    await requireSuperAdminAuth(request)

    const { id } = await params

    // Fetch specific activity log
    const { data: log, error } = await supabaseAdmin
      .from('indb_security_activity_logs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching activity log:', error)
      return NextResponse.json(
        { error: 'Activity log not found' },
        { status: 404 }
      )
    }

    // Get user profile and auth data
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('full_name, user_id, role, phone_number')
      .eq('user_id', log.user_id)
      .single()

    let userEmail = null
    if (!profileError && userProfile) {
      try {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userProfile.user_id)
        if (!authError && authUser?.user) {
          userEmail = authUser.user.email
        }
      } catch (authFetchError) {
        console.error(`Failed to fetch auth data for user ${log.user_id}:`, authFetchError)
      }
    }

    // Get related activity logs for this user (last 10)
    const { data: relatedLogs, error: relatedError } = await supabaseAdmin
      .from('indb_security_activity_logs')
      .select('id, event_type, action_description, created_at, success')
      .eq('user_id', log.user_id)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    const logWithUserData = {
      ...log,
      user_name: userProfile?.full_name || 'Unknown User',
      user_email: userEmail || 'Unknown Email',
      user_role: userProfile?.role || 'unknown',
      user_phone: userProfile?.phone_number || null,
      related_activities: relatedLogs || []
    }

    return NextResponse.json({ 
      success: true, 
      log: logWithUserData 
    })

  } catch (error: any) {
    console.error('Admin activity log detail API error:', error)
    
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