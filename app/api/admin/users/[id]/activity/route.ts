import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdminAuth } from '@/lib/admin-auth'
import { ActivityLogger } from '@/lib/activity-logger'

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

    // Verify user exists
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('full_name, user_id')
      .eq('user_id', userId)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user activity logs
    const logs = await ActivityLogger.getUserActivityLogs(userId, limit, offset)

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('indb_security_activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    return NextResponse.json({ 
      success: true, 
      logs,
      user: {
        id: userId,
        name: userProfile.full_name,
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