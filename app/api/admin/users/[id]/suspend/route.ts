import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH /api/admin/users/[id]/suspend - Suspend/unsuspend user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require super admin authentication
    const adminUser = await requireSuperAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const { id: userId } = await params

    // Get current user to check status and get name for logging
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('full_name, role')
      .eq('user_id', userId)
      .single()

    if (fetchError || !currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user from Supabase auth to check current ban status
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (authError) {
      console.error('Auth user fetch error:', authError)
      return NextResponse.json(
        { error: 'Failed to fetch user auth data' },
        { status: 500 }
      )
    }

    const isBanned = authUser.user?.banned_until !== null
    const action = isBanned ? 'unban' : 'ban'

    // Update user ban status in Supabase auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: isBanned ? 'none' : '10000h' // 10000h = ~1 year suspension
    })

    if (updateError) {
      console.error('User suspend/unsuspend error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user status' },
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
          action_description: `${action === 'ban' ? 'Suspended' : 'Unsuspended'} user ${currentUser.full_name || userId}`,
          target_type: 'user',
          target_id: userId,
          metadata: { 
            action,
            user_role: currentUser.role,
            previous_status: isBanned ? 'suspended' : 'active'
          }
        })
    } catch (logError) {
      console.error('Failed to log admin activity:', logError)
    }

    return NextResponse.json({ 
      success: true,
      action,
      message: `User ${action === 'ban' ? 'suspended' : 'unsuspended'} successfully`
    })

  } catch (error: any) {
    console.error('Admin user suspend API error:', error)
    
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