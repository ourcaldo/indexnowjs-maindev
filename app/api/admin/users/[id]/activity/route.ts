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

    const { id: userId } = await params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit

    // Fetch user's activity logs
    const { data: logs, error } = await supabaseAdmin
      .from('indb_security_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching user activity logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user activity logs' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('indb_security_activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Get user profile for context
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('full_name, user_id')
      .eq('user_id', userId)
      .single()

    let userEmail = null
    if (!profileError && userProfile) {
      try {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userProfile.user_id)
        if (!authError && authUser?.user) {
          userEmail = authUser.user.email
        }
      } catch (authFetchError) {
        console.error(`Failed to fetch auth data for user ${userId}:`, authFetchError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      logs: logs || [],
      user: {
        id: userId,
        name: userProfile?.full_name || 'Unknown User',
        email: userEmail || 'Unknown Email'
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error: any) {
    console.error('User activity logs API error:', error)
    
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