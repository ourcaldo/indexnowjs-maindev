import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { getServerAuthUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await getServerAuthUser(request)
    const notificationId = (await params).id

    // Dismiss the notification for the authenticated user
    const { error } = await supabaseAdmin
      .from('indb_notifications_dashboard')
      .update({ 
        is_read: true,
        dismissed_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', user.userId)

    if (error) {
      console.error('Error dismissing notification:', error)
      return NextResponse.json(
        { error: 'Failed to dismiss notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Notification dismissed successfully'
    })

  } catch (error) {
    if (error instanceof Error && error.message.includes('Authentication required')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.error('Notification dismiss error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}