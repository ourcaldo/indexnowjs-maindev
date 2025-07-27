import { NextRequest, NextResponse } from 'next/server'
import { requireServerAdminAuth } from '@/lib/server-auth'
import { createClient } from '@supabase/supabase-js'
import { ActivityLogger, ActivityEventTypes } from '@/lib/activity-logger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminUser = await requireServerAdminAuth(request)
    
    // Log admin order management access
    try {
      await ActivityLogger.logAdminDashboardActivity(
        adminUser.id,
        ActivityEventTypes.ORDER_MANAGEMENT,
        'Accessed order management interface',
        request,
        {
          section: 'order_management',
          action: 'view_orders',
          adminUser: adminUser.email
        }
      )
    } catch (logError) {
      console.error('Failed to log admin order activity:', logError)
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const status = searchParams.get('status')
    const customer = searchParams.get('customer')
    const packageId = searchParams.get('package_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const amountMin = searchParams.get('amount_min')
    const amountMax = searchParams.get('amount_max')

    const offset = (page - 1) * limit

    // Build base query
    let query = supabaseAdmin
      .from('indb_payment_transactions')
      .select(`
        id,
        user_id,
        package_id,
        gateway_id,
        transaction_type,
        transaction_status,
        amount,
        currency,
        payment_method,
        payment_reference,
        payment_proof_url,
        gateway_transaction_id,
        verified_by,
        verified_at,
        processed_at,
        notes,
        metadata,
        created_at,
        updated_at,
        package:indb_payment_packages(
          id,
          name,
          slug,
          description,
          price,
          currency,
          billing_period,
          features
        ),
        gateway:indb_payment_gateways(
          id,
          name,
          slug
        )
      `, { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('transaction_status', status)
    }

    if (customer) {
      // Search by customer name or email - need to use user profile join
      query = query.ilike('user.full_name', `%${customer}%`)
    }

    if (packageId) {
      query = query.eq('package_id', packageId)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    if (amountMin) {
      query = query.gte('amount', parseFloat(amountMin))
    }

    if (amountMax) {
      query = query.lte('amount', parseFloat(amountMax))
    }

    // Execute query with pagination
    const { data: orders, error: ordersError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    // Fetch user profiles and auth data for each order
    const enrichedOrders = []
    if (orders && orders.length > 0) {
      for (const order of orders) {
        // Get user profile from database
        const { data: userProfile } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('full_name, role, created_at')
          .eq('user_id', order.user_id)
          .single()

        // Get user email from Supabase Auth
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(order.user_id)

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

        enrichedOrders.push({
          ...order,
          user: {
            user_id: order.user_id,
            full_name: userProfile?.full_name || 'Unknown User',
            role: userProfile?.role || 'user',
            email: authUser?.user?.email || 'N/A',
            created_at: userProfile?.created_at || order.created_at
          },
          verifier: verifierProfile
        })
      }
    }

    // Get summary statistics
    const { data: summaryData, error: summaryError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .select('transaction_status, amount, currency, created_at')

    if (summaryError) {
      console.error('Error fetching summary:', summaryError)
      return NextResponse.json(
        { error: 'Failed to fetch summary statistics' },
        { status: 500 }
      )
    }

    // Calculate summary statistics
    const summary = {
      total_orders: summaryData?.length || 0,
      pending_orders: summaryData?.filter(t => t.transaction_status === 'pending').length || 0,
      proof_uploaded_orders: summaryData?.filter(t => t.transaction_status === 'proof_uploaded').length || 0,
      completed_orders: summaryData?.filter(t => t.transaction_status === 'completed').length || 0,
      failed_orders: summaryData?.filter(t => t.transaction_status === 'failed').length || 0,
      total_revenue: summaryData?.filter(t => t.transaction_status === 'completed').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0,
      recent_activity: summaryData?.filter(t => {
        const createdAt = new Date(t.created_at)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return createdAt >= sevenDaysAgo
      }).length || 0
    }

    // Log admin activity
    try {
      await ActivityLogger.logAdminAction(
        adminUser.id,
        'orders_list_view',
        undefined,
        `Viewed orders list (${enrichedOrders?.length || 0} orders)`,
        request,
        {
          ordersView: true,
          totalOrders: enrichedOrders?.length || 0,
          filters: {
            status,
            customer,
            packageId,
            dateFrom,
            dateTo,
            amountMin,
            amountMax
          }
        }
      )
    } catch (logError) {
      console.error('Failed to log admin activity:', logError)
    }

    return NextResponse.json({
      success: true,
      orders: enrichedOrders,
      summary,
      pagination: {
        current_page: page,
        total_pages: Math.ceil((count || 0) / limit),
        total_items: count || 0,
        items_per_page: limit,
        has_next: offset + limit < (count || 0),
        has_prev: page > 1
      }
    })

  } catch (error: any) {
    console.error('Admin orders API error:', error)
    
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