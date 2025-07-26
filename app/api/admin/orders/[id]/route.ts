import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdminAuth } from '@/lib/server-auth'
import { createClient } from '@supabase/supabase-js'
import { ActivityLogger } from '@/lib/activity-logger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const adminUser = await requireServerAdminAuth(request)
    const resolvedParams = await params
    const orderId = resolvedParams.id

    // Fetch order with all related data
    const { data: order, error: orderError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .select(`
        *,
        package:indb_payment_packages(
          id,
          name,
          slug,
          description,
          price,
          currency,
          billing_period,
          features,
          quota_limits
        ),
        user:indb_auth_user_profiles!inner(
          user_id,
          full_name,
          role,
          email_notifications,
          phone_number,
          created_at,
          package_id,
          subscribed_at,
          expires_at,
          daily_quota_used
        ),
        gateway:indb_payment_gateways(
          id,
          name,
          slug,
          description,
          configuration
        ),
        verifier:indb_auth_user_profiles(
          user_id,
          full_name,
          role
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('Error fetching order:', orderError)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Get user's email from Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(order.user_id)
    
    // Attach email to user data
    const orderWithEmail = {
      ...order,
      user: {
        ...order.user,
        email: authUser?.user?.email || 'N/A'
      }
    }

    // Get activity history for this order
    const { data: activityHistory, error: activityError } = await supabaseAdmin
      .from('indb_security_activity_logs')
      .select(`
        id,
        event_type,
        action_description,
        created_at,
        user_id,
        metadata,
        user:indb_auth_user_profiles(
          full_name,
          role
        )
      `)
      .or(`target_id.eq.${orderId},metadata->>transaction_id.eq.${orderId}`)
      .order('created_at', { ascending: false })
      .limit(20)

    // Log admin activity
    try {
      await ActivityLogger.logAdminAction(
        adminUser.id,
        'order_detail_view',
        orderId,
        `Viewed order details for ${order.payment_reference}`,
        request,
        {
          orderDetailView: true,
          orderId,
          orderStatus: order.transaction_status,
          orderAmount: order.amount,
          customerId: order.user_id
        }
      )
    } catch (logError) {
      console.error('Failed to log admin activity:', logError)
    }

    return NextResponse.json({
      success: true,
      order: orderWithEmail,
      activity_history: activityHistory || []
    })

  } catch (error: any) {
    console.error('Admin order detail API error:', error)
    
    if (error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}