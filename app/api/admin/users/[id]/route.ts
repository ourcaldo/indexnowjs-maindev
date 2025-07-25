import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/admin/users/[id] - Get individual user details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require super admin authentication
    const adminUser = await requireSuperAdminAuth()
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const userId = params.id

    // Get user profile from our custom table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user auth data from Supabase auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (authError) {
      console.error('Auth user fetch error:', authError)
    }

    // Combine profile and auth data
    const userWithAuthData = {
      ...profile,
      email: authUser.user?.email || null,
      email_confirmed_at: authUser.user?.email_confirmed_at || null,
      last_sign_in_at: authUser.user?.last_sign_in_at || null,
    }

    // Log admin activity
    try {
      await supabaseAdmin
        .from('indb_admin_activity_logs')
        .insert({
          admin_id: adminUser.id,
          action_type: 'user_management',
          action_description: `Viewed user details for ${profile.full_name || authUser.user?.email}`,
          target_type: 'user',
          target_id: userId,
          metadata: { user_role: profile.role }
        })
    } catch (logError) {
      console.error('Failed to log admin activity:', logError)
    }

    return NextResponse.json({ 
      success: true, 
      user: userWithAuthData 
    })

  } catch (error: any) {
    console.error('Admin user detail API error:', error)
    
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

// PATCH /api/admin/users/[id] - Update user details
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require super admin authentication
    const adminUser = await requireSuperAdminAuth()
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const userId = params.id
    const body = await request.json()
    const { full_name, role, email_notifications, phone_number } = body

    // Update user profile
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        full_name,
        role,
        email_notifications,
        phone_number,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      )
    }

    // Log admin activity
    try {
      await supabaseAdmin
        .from('indb_admin_activity_logs')
        .insert({
          admin_id: adminUser.id,
          action_type: 'user_management',
          action_description: `Updated user profile for ${full_name || userId}`,
          target_type: 'user',
          target_id: userId,
          metadata: { 
            updated_fields: { full_name, role, email_notifications, phone_number },
            new_role: role
          }
        })
    } catch (logError) {
      console.error('Failed to log admin activity:', logError)
    }

    return NextResponse.json({ 
      success: true, 
      user: updatedProfile 
    })

  } catch (error: any) {
    console.error('Admin user update API error:', error)
    
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