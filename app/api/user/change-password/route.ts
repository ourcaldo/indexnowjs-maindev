import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { currentPassword, newPassword } = body
    const authorization = request.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Use Supabase Auth to update the password
    const { error: updateError } = await supabaseAdmin!.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to change password' },
        { status: 400 }
      )
    }

    // Log password change activity
    try {
      const { ActivityLogger, ActivityEventTypes } = await import('@/lib/activity-logger')
      await ActivityLogger.logActivity({
        userId: user.id,
        eventType: ActivityEventTypes.PASSWORD_CHANGE,
        actionDescription: 'Changed account password',
        request,
        metadata: {
          passwordChange: true,
          security_event: true
        }
      })
    } catch (logError) {
      console.error('Failed to log password change activity:', logError)
    }

    return NextResponse.json({
      message: 'Password changed successfully',
    })

  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}