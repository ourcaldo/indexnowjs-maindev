import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get JWT token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active service account quota exhausted notifications
    const { data: notifications, error } = await supabaseAdmin
      .from('indb_notifications_dashboard')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'service_account_quota_exhausted')
      .eq('is_read', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching quota notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    return NextResponse.json({ 
      notifications: notifications || []
    })

  } catch (error) {
    console.error('Error in service account quota notifications API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}