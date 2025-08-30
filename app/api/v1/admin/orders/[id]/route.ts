import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdminAuth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { ActivityLogger } from '@/lib/monitoring'

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
          pricing_tiers,
          currency,
          billing_period,
          features,
          quota_limits
        ),
        gateway:indb_payment_gateways(
          id,
          name,
          slug,
          description,
          configuration
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

    // Get user profile data
    const { data: userProfile } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('full_name, role, phone_number, created_at, package_id, subscribed_at, expires_at, daily_quota_used')
      .eq('user_id', order.user_id)
      .single()

    // Get user's email from Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(order.user_id)
    
    // Get verifier profile if exists
    let verifierProfile = null
    if (order.verified_by) {
      const { data: verifier } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('user_id, full_name, role')
        .eq('user_id', order.verified_by)
        .single()
      verifierProfile = verifier
    }
    
    // Attach user and verifier data to order
    const orderWithEmail = {
      ...order,
      user: {
        user_id: order.user_id,
        full_name: userProfile?.full_name || 'Unknown User',
        email: authUser?.user?.email || 'N/A',
        role: userProfile?.role || 'user',
        phone_number: userProfile?.phone_number,
        created_at: userProfile?.created_at || order.created_at,
        package_id: userProfile?.package_id,
        subscribed_at: userProfile?.subscribed_at,
        expires_at: userProfile?.expires_at,
        daily_quota_used: userProfile?.daily_quota_used
      },
      verifier: verifierProfile
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

    // Get transaction history from the dedicated history table
    const { data: transactionHistory, error: transactionHistoryError } = await supabaseAdmin
      .from('indb_payment_transactions_history')
      .select(`
        id,
        transaction_id,
        old_status,
        new_status,
        action_type,
        action_description,
        changed_by,
        changed_by_type,
        notes,
        metadata,
        created_at,
        user:indb_auth_user_profiles!changed_by(
          full_name,
          role
        )
      `)
      .eq('transaction_id', orderId)
      .order('created_at', { ascending: false })

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
      activity_history: activityHistory || [],
      transaction_history: transactionHistory || []
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