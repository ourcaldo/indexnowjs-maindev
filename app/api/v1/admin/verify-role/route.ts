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

    // Authentication is now mandatory - try Bearer token first, then cookies
    let user = null
    let authError = null

    // Try Bearer token authentication first (for login flow)
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7) // Remove 'Bearer ' prefix
      
      const { data: userData, error: tokenError } = await supabaseAdmin.auth.getUser(token)
      user = userData.user
      authError = tokenError
    }

    // Fallback to cookie-based authentication if no valid user found yet
    if (!user) {
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
      
      const { data: { user: cookieUser }, error: cookieError } = await supabaseServer.auth.getUser()
      user = cookieUser
      authError = cookieError
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get authenticated user's role to check authorization
    const { data: authProfile } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    const isRequestingSuperAdmin = authProfile?.role === 'super_admin'

    // Authorization: Users can only check their own role (unless they're super admin)
    if (userId !== user.id && !isRequestingSuperAdmin) {
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