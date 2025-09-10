import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the current authenticated user (if any) to validate authorization
    let currentUser = null
    try {
      const supabaseServer = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll() {
              // Cannot set cookies in API routes
            },
          },
        }
      )
      
      const { data: { user } } = await supabaseServer.auth.getUser()
      if (user) {
        // Get their role from database to check admin status
        const { data: profile } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()
        
        currentUser = { 
          id: user.id, 
          email: user.email,
          isSuperAdmin: profile?.role === 'super_admin'
        }
      }
    } catch (authError) {
      // Authentication failed - allow checking but restrict to basic validation
      console.log('Authentication check failed, allowing limited role verification')
    }

    // If user is authenticated, only allow checking their own role (unless they're super admin)
    if (currentUser && userId !== currentUser.id && !currentUser.isSuperAdmin) {
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