import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { requireSuperAdminAuth, adminAuthService } from '@/lib/auth'
import { ActivityLogger } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    const adminUser = await requireSuperAdminAuth(request)

    // Use materialized view to get all user data in a single query (fixes N+1 problem)
    const { data: usersWithAuthData, error: usersError } = await supabaseAdmin
      .from('indb_admin_user_summary')
      .select(`
        *,
        package:indb_payment_packages(
          id,
          name,
          slug,
          quota_limits
        )
      `)
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users from materialized view:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    // Log admin activity using enhanced tracking
    if (adminUser) {
      try {
        await ActivityLogger.logAdminAction(
          adminUser.id,
          'user_list_view',
          undefined,
          `Viewed users list (${usersWithAuthData?.length || 0} users)`,
          request,
          { 
            userListView: true,
            totalUsers: usersWithAuthData?.length || 0,
            activeUsers: usersWithAuthData?.filter(u => u.role === 'user').length || 0,
            adminUsers: usersWithAuthData?.filter(u => u.role === 'admin').length || 0,
            superAdminUsers: usersWithAuthData?.filter(u => u.role === 'super_admin').length || 0
          }
        )
      } catch (logError) {
        console.error('Failed to log admin activity:', logError)
        // Don't fail the request if logging fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      users: usersWithAuthData 
    })

  } catch (error: any) {
    console.error('Admin users API error:', error)
    
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