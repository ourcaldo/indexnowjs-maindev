import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { authService } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get user profile with current subscription info
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select(`
        *,
        package:indb_payment_packages(*)
      `)
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    // Get current active subscription
    const { data: currentSubscription, error: subscriptionError } = await supabaseAdmin
      .from('indb_payment_subscriptions')
      .select(`
        *,
        package:indb_payment_packages(*),
        gateway:indb_payment_gateways(*)
      `)
      .eq('user_id', user.id)
      .eq('subscription_status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get billing statistics
    const { data: billingStats, error: statsError } = await supabaseAdmin
      .from('user_billing_summary')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Get recent transactions
    const { data: recentTransactions, error: transactionsError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .select(`
        *,
        package:indb_payment_packages(name),
        gateway:indb_payment_gateways(name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate days remaining
    let daysRemaining = null
    if (userProfile.expires_at) {
      const expiryDate = new Date(userProfile.expires_at)
      const now = new Date()
      const diffTime = expiryDate.getTime() - now.getTime()
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    // Prepare response data
    const responseData = {
      currentSubscription: currentSubscription ? {
        package_name: currentSubscription.package?.name || 'Unknown',
        package_slug: currentSubscription.package?.slug || '',
        subscription_status: currentSubscription.subscription_status,
        expires_at: currentSubscription.expires_at,
        subscribed_at: currentSubscription.started_at,
        amount_paid: parseFloat(currentSubscription.amount_paid || '0'),
        billing_period: currentSubscription.billing_period
      } : null,
      billingStats: {
        total_payments: billingStats?.total_payments || 0,
        total_spent: parseFloat(billingStats?.total_spent || '0'),
        next_billing_date: userProfile.expires_at,
        days_remaining: daysRemaining
      },
      recentTransactions: (recentTransactions || []).map(transaction => ({
        id: transaction.id,
        transaction_type: transaction.transaction_type,
        amount: parseFloat(transaction.amount || '0'),
        currency: transaction.currency,
        transaction_status: transaction.transaction_status,
        created_at: transaction.created_at,
        package_name: transaction.package?.name || 'Unknown',
        payment_method: transaction.payment_method || 'Unknown'
      }))
    }

    return NextResponse.json(responseData)

  } catch (error: any) {
    console.error('Billing overview API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}