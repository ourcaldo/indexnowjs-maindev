import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/admin/users/[id]/reset-password - Generate new password for user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const userId = params.id

    // Get current user to get name for logging
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

    // Generate a secure random password
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
      let password = ''
      
      // Ensure at least one character from each category
      password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
      password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
      password += '0123456789'[Math.floor(Math.random() * 10)]
      password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
      
      // Fill remaining characters
      for (let i = 4; i < 12; i++) {
        password += chars[Math.floor(Math.random() * chars.length)]
      }
      
      // Shuffle the password
      return password.split('').sort(() => Math.random() - 0.5).join('')
    }

    const newPassword = generatePassword()

    // Update user password in Supabase auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (updateError) {
      console.error('Password reset error:', updateError)
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      )
    }

    // Log admin activity (without including the actual password)
    try {
      await supabaseAdmin
        .from('indb_admin_activity_logs')
        .insert({
          admin_id: adminUser.id,
          action_type: 'user_management',
          action_description: `Reset password for user ${currentUser.full_name || userId}`,
          target_type: 'user',
          target_id: userId,
          metadata: { 
            user_role: currentUser.role,
            password_length: newPassword.length
          }
        })
    } catch (logError) {
      console.error('Failed to log admin activity:', logError)
    }

    return NextResponse.json({ 
      success: true,
      newPassword: newPassword,
      message: 'Password reset successfully'
    })

  } catch (error: any) {
    console.error('Admin password reset API error:', error)
    
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