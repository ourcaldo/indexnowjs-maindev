import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
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
      profileError: profileError ? profileError.message : null
    })
  } catch (error) {
    console.error('Debug auth error:', error)
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await authService.getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Update or create user profile with super_admin role
    const { data: profile, error } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .upsert({
        user_id: currentUser.id,
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

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated to super_admin',
      profile 
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ 
      error: 'Update failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}