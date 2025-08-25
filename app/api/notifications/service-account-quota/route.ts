import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

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

    console.log(`🔍 Fetching service account quota notifications for user: ${user.id}`);
    
    // Get active service account quota exhausted notifications
    // Note: Using type='error' with metadata.notification_type='service_account_quota_exhausted'
    // due to database constraint limiting type to 'info', 'success', 'warning', 'error'
    const { data: notifications, error } = await supabaseAdmin
      .from('indb_notifications_dashboard')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'error')
      .eq('is_read', false)
      .gte('expires_at', new Date().toISOString())
      .contains('metadata', { notification_type: 'service_account_quota_exhausted' })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching quota notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    console.log(`📊 Found ${notifications?.length || 0} active quota notifications for user ${user.id}`);
    
    if (notifications && notifications.length > 0) {
      console.log('🔔 Active notifications:', notifications.map(n => ({ 
        id: n.id, 
        title: n.title, 
        created_at: n.created_at,
        expires_at: n.expires_at,
        service_account_name: n.metadata?.service_account_name
      })));
    }

    return NextResponse.json({ 
      notifications: notifications || []
    })

  } catch (error) {
    console.error('Error in service account quota notifications API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}