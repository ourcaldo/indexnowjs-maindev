import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { getServerAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getServerAuthUser(request)
    if (!user) {
      throw new Error('Authentication required')
    }

    // Get quota-related notifications for the authenticated user
    const { data: notifications, error } = await supabaseAdmin
      .from('indb_notifications_dashboard')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'quota_warning')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching quota notifications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: notifications || []
    })

  } catch (error) {
    if (error instanceof Error && error.message.includes('Authentication required')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.error('Service account quota notifications API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}