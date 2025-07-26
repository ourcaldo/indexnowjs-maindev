import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
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

    // Parse request body
    const { package_id, billing_period } = await request.json()

    if (!package_id || !billing_period) {
      return NextResponse.json(
        { error: 'Package ID and billing period are required' },
        { status: 400 }
      )
    }

    // Get package details
    const { data: packageData, error: packageError } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('id', package_id)
      .eq('is_active', true)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { error: 'Package not found or inactive' },
        { status: 404 }
      )
    }

    // Get default payment gateway
    const { data: gateway, error: gatewayError } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    if (gatewayError || !gateway) {
      return NextResponse.json(
        { error: 'No active payment gateway found' },
        { status: 500 }
      )
    }

    // Calculate price based on billing period
    let amount = parseFloat(packageData.price || '0')
    let actualBillingPeriod = billing_period
    
    // Check for pricing tiers
    if (packageData.pricing_tiers && packageData.pricing_tiers[billing_period]) {
      const tier = packageData.pricing_tiers[billing_period]
      amount = tier.promo_price || tier.regular_price
      actualBillingPeriod = billing_period
    }

    // Generate transaction reference
    const transactionRef = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create subscription record
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('indb_payment_subscriptions')
      .insert({
        user_id: user.id,
        package_id: package_id,
        gateway_id: gateway.id,
        subscription_status: 'pending',
        billing_period: actualBillingPeriod,
        amount_paid: amount,
        currency: packageData.currency || 'IDR',
        auto_renew: false,
        metadata: {
          requested_at: new Date().toISOString(),
          billing_period_requested: billing_period,
          package_name: packageData.name,
          package_slug: packageData.slug
        }
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError)
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      )
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        package_id: package_id,
        gateway_id: gateway.id,
        transaction_type: 'subscription',
        transaction_status: 'pending',
        amount: amount,
        currency: packageData.currency || 'IDR',
        payment_method: gateway.slug === 'bank_transfer' ? 'bank_transfer' : 'online_payment',
        payment_reference: transactionRef,
        metadata: {
          package_name: packageData.name,
          billing_period: actualBillingPeriod,
          subscription_id: subscription.id,
          gateway_name: gateway.name
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      )
    }

    // Prepare payment instructions based on gateway type
    let paymentInstructions = null
    
    if (gateway.slug === 'bank_transfer') {
      const bankDetails = gateway.configuration || {}
      paymentInstructions = {
        method: 'bank_transfer',
        bank_name: bankDetails.bank_name || 'Bank BCA',
        account_number: bankDetails.account_number || '1234567890',
        account_name: bankDetails.account_name || 'IndexNow Pro',
        amount: amount,
        currency: packageData.currency || 'IDR',
        reference: transactionRef,
        instructions: [
          `Transfer ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: packageData.currency || 'IDR' }).format(amount)} to the bank account above`,
          `Use reference: ${transactionRef}`,
          'Send proof of payment to our support team',
          'Your subscription will be activated after payment verification'
        ]
      }
    }

    // Create notification for user
    await supabaseAdmin
      .from('indb_notifications_dashboard')
      .insert({
        user_id: user.id,
        type: 'subscription_pending',
        title: 'Subscription Request Created',
        message: `Your subscription request for ${packageData.name} (${actualBillingPeriod}) is pending payment. Reference: ${transactionRef}`,
        metadata: {
          transaction_id: transaction.id,
          subscription_id: subscription.id,
          package_name: packageData.name,
          amount: amount,
          currency: packageData.currency || 'IDR',
          payment_reference: transactionRef
        },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })

    return NextResponse.json({
      success: true,
      transaction_id: transaction.id,
      subscription_id: subscription.id,
      payment_reference: transactionRef,
      amount: amount,
      currency: packageData.currency || 'IDR',
      payment_instructions: paymentInstructions,
      message: 'Subscription request created successfully. You will receive payment instructions shortly.'
    })

  } catch (error: any) {
    console.error('Billing subscribe API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}