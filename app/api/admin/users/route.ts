import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdminAuth, adminAuthService } from '@/lib/admin-auth'
import { ActivityLogger } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    const adminUser = await requireSuperAdminAuth(request)

    // Fetch user profiles - we'll get auth data separately via RPC or admin API
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError)
      return NextResponse.json(
        { error: 'Failed to fetch user profiles' },
        { status: 500 }
      )
    }

    // Get auth data for each user using admin API
    const usersWithAuthData = []
    
    for (const profile of profiles || []) {
      try {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id)
        
        if (!authError && authUser?.user) {
          usersWithAuthData.push({
            ...profile,
            email: authUser.user.email,
            email_confirmed_at: authUser.user.email_confirmed_at,
            last_sign_in_at: authUser.user.last_sign_in_at,
            auth_created_at: authUser.user.created_at
          })
        } else {
          // Include profile even if auth data fetch failed
          usersWithAuthData.push({
            ...profile,
            email: null,
            email_confirmed_at: null,
            last_sign_in_at: null,
            auth_created_at: null
          })
        }
      } catch (authFetchError) {
        console.error(`Failed to fetch auth data for user ${profile.user_id}:`, authFetchError)
        // Include profile even if auth data fetch failed
        usersWithAuthData.push({
          ...profile,
          email: null,
          email_confirmed_at: null,
          last_sign_in_at: null,
          auth_created_at: null
        })
      }
    }

    // Log admin activity using enhanced tracking
    if (adminUser) {
      try {
        await ActivityLogger.logAdminAction(
          adminUser.id,
          'user_list_view',
          undefined,
          `Viewed users list (${usersWithAuthData.length} users)`,
          request,
          { 
            userListView: true,
            totalUsers: usersWithAuthData.length,
            activeUsers: usersWithAuthData.filter(u => u.role === 'user').length,
            adminUsers: usersWithAuthData.filter(u => u.role === 'admin').length,
            superAdminUsers: usersWithAuthData.filter(u => u.role === 'super_admin').length
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