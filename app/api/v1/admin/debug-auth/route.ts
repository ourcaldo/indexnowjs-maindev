import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'
import { requireServerSuperAdminAuth } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Debug routes disabled in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        error: 'Debug routes disabled in production' 
      }, { status: 404 })
    }

    // Require super admin authentication even in development
    await requireServerSuperAdminAuth(request)

    const currentUser = await authService.getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        currentUser: null,
        profile: null 
      })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single()

    return NextResponse.json({
      currentUser: {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name
      },
      profile: profile || 'No profile found',
      profileError: profileError ? profileError.message : null,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Debug auth error:', error)
    
    // Handle authentication errors
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Completely disable privilege escalation in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        error: 'Privilege escalation disabled in production' 
      }, { status: 403 })
    }

    // SECURITY: Require existing super admin authentication to escalate others
    await requireServerSuperAdminAuth(request)

    const { targetUserId } = await request.json()
    const currentUser = await authService.getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Use provided target user ID or current user ID
    const userIdToEscalate = targetUserId || currentUser.id

    // Update or create user profile with super_admin role
    const { data: profile, error } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .upsert({
        user_id: userIdToEscalate,
        full_name: currentUser.name || currentUser.email?.split('@')[0] || 'Admin User',
        role: 'super_admin',
        email_notifications: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json({ error: 'Failed to update profile', details: error }, { status: 500 })
    }

    // Log the privilege escalation for audit purposes
    console.log(`⚠️ [SECURITY] Privilege escalation performed in development:`, {
      performedBy: currentUser.id,
      targetUser: userIdToEscalate,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated to super_admin (development only)',
      profile,
      warning: 'This operation is only allowed in development environment'
    })
  } catch (error: any) {
    console.error('Profile update error:', error)
    
    // Handle authentication errors
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }
    
    return NextResponse.json({ 
      error: 'Update failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}