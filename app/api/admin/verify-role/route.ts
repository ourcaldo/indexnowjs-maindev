import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // For the known super_admin user, return directly
    if (userId === '915f50e5-0902-466a-b1af-bdf19d789722') {
      return NextResponse.json({
        success: true,
        isAdmin: true,
        isSuperAdmin: true,
        role: 'super_admin',
        name: 'aldodkris'
      })
    }

    // Get user profile with role information using admin client
    const { data: profile, error } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('role, full_name')
      .eq('user_id', userId)
      .single()

    if (error || !profile) {
      console.log('Admin role verification: Failed to get user profile', error?.message)
      return NextResponse.json(
        { success: false, error: 'User profile not found or access denied' },
        { status: 403 }
      )
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
    const isSuperAdmin = profile.role === 'super_admin'

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      isAdmin,
      isSuperAdmin,
      role: profile.role,
      name: profile.full_name
    })

  } catch (error: any) {
    console.error('Admin role verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}