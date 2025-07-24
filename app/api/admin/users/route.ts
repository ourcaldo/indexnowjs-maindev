import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdminAuth, adminAuthService } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    await requireSuperAdminAuth()

    // Fetch users with profile data and auth data
    const { data: users, error } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select(`
        *,
        auth_users:user_id (
          email,
          email_confirmed_at,
          last_sign_in_at,
          created_at as auth_created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Transform the data to flatten auth_users data
    const transformedUsers = users?.map(user => ({
      ...user,
      email: user.auth_users?.email,
      email_confirmed_at: user.auth_users?.email_confirmed_at,
      last_sign_in_at: user.auth_users?.last_sign_in_at,
      auth_created_at: user.auth_users?.auth_created_at,
      auth_users: undefined // Remove nested object
    })) || []

    // Log admin activity
    await adminAuthService.logAdminActivity(
      'user_management',
      'Viewed users list',
      'users',
      undefined,
      { count: transformedUsers.length }
    )

    return NextResponse.json({ 
      success: true, 
      users: transformedUsers 
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