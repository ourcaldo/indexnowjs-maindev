import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { requireSuperAdminAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify super admin authentication
    await requireSuperAdminAuth(request)

    const { id } = await params

    // Fetch single activity log with user data
    const { data: log, error } = await supabaseAdmin
      .from('indb_security_activity_logs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !log) {
      return NextResponse.json(
        { error: 'Activity log not found' },
        { status: 404 }
      )
    }

    // Get user profile and auth data
    let userProfile = null
    let userEmail = null

    try {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('full_name, user_id')
        .eq('user_id', log.user_id)
        .single()

      if (!profileError && profile) {
        userProfile = profile
        
        try {
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id)
          if (!authError && authUser?.user) {
            userEmail = authUser.user.email
          }
        } catch (authFetchError) {
          console.error(`Failed to fetch auth data for user ${log.user_id}:`, authFetchError)
        }
      }
    } catch (fetchError) {
      console.error(`Failed to fetch user data for log ${log.id}:`, fetchError)
    }

    // Get related activities from the same user (last 5)
    const { data: relatedLogs, error: relatedError } = await supabaseAdmin
      .from('indb_security_activity_logs')
      .select('*')
      .eq('user_id', log.user_id)
      .neq('id', log.id)
      .order('created_at', { ascending: false })
      .limit(5)

    const enrichedLog = {
      ...log,
      user_name: userProfile?.full_name || 'Unknown User',
      user_email: userEmail || 'Unknown Email',
      related_activities: relatedLogs || []
    }

    return NextResponse.json({ 
      success: true, 
      activity: enrichedLog
    })

  } catch (error: any) {
    console.error('Admin activity detail API error:', error)
    
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