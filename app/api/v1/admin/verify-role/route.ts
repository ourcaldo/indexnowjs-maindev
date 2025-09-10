import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { requireAdminAuth } from '@/lib/auth/admin-auth'

export async function POST(request: NextRequest) {
  try {
    // First, verify the requesting user is authenticated and has admin access
    const requestingUser = await requireAdminAuth(request)
    if (!requestingUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Users can only check their own role, unless they are super admin
    if (userId !== requestingUser.id && !requestingUser.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied - can only check your own role' },
        { status: 403 }
      )
    }

    // Get user profile with role information using admin client
    const { data: profile, error } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('role, full_name')
      .eq('user_id', userId)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found or access denied' },
        { status: 403 }
      )
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
    const isSuperAdmin = profile.role === 'super_admin'

    return NextResponse.json({
      success: true,
      isAdmin,
      isSuperAdmin,
      role: profile.role,
      name: profile.full_name || 'Unknown'
    })

  } catch (error: any) {
    console.error('Admin role verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}