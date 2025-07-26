import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdminAuth } from '@/lib/admin-auth'
import { ActivityLogger } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    await requireSuperAdminAuth(request)

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit
    const userId = searchParams.get('user') || null
    const searchTerm = searchParams.get('search') || ''
    const eventType = searchParams.get('event_type') || 'all'

    // Calculate date filter
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - days)

    // Build query with filters
    let query = supabaseAdmin
      .from('indb_security_activity_logs')
      .select('*')
      .gte('created_at', dateFilter.toISOString())

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (eventType !== 'all') {
      query = query.eq('event_type', eventType)
    }

    if (searchTerm) {
      query = query.or(`action_description.ilike.%${searchTerm}%,user_agent.ilike.%${searchTerm}%`)
    }

    // Apply pagination and ordering
    const { data: logs, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching activity logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activity logs' },
        { status: 500 }
      )
    }

    // Get user profiles for each log to include user name/email
    const logsWithUserData = []
    
    for (const log of logs || []) {
      try {
        const { data: userProfile, error: profileError } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('full_name, user_id')
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

        logsWithUserData.push({
          ...log,
          user_name: userProfile?.full_name || 'Unknown User',
          user_email: userEmail || 'Unknown Email'
        })
      } catch (fetchError) {
        console.error(`Failed to fetch user data for log ${log.id}:`, fetchError)
        logsWithUserData.push({
          ...log,
          user_name: 'Unknown User',
          user_email: 'Unknown Email'
        })
      }
    }

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('indb_security_activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateFilter.toISOString())

    return NextResponse.json({ 
      success: true, 
      logs: logsWithUserData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
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