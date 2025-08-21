import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createMidtransService } from '@/lib/midtrans-service'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  console.log('🚀 Midtrans recurring payment API called')
  
  try {
    // Get authenticated user from Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔐 Auth header present:', !!authHeader)
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Authentication failed - missing or invalid auth header')
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📝 Request body received:', { 
      package_id: body.package_id, 
      billing_period: body.billing_period,
      has_customer_info: !!body.customer_info,
      has_card_data: !!body.card_data
    })
    
    const { 
      package_id, 
      billing_period, 
      customer_info, 
      token_id 
    } = body

    if (!package_id || !billing_period || !customer_info || !token_id) {
      console.log('❌ Missing required fields:', { package_id, billing_period, customer_info: !!customer_info, token_id: !!token_id })
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate token_id
    console.log('🔐 Token validation:', {
      has_token_id: !!token_id,
      token_length: token_id?.length
    })
    
    if (!token_id || typeof token_id !== 'string' || token_id.length < 10) {
      console.log('❌ Invalid token_id')
      return NextResponse.json(
        { success: false, message: 'Valid card token is required' },
        { status: 400 }
      )
    }

    // Get Midtrans payment gateway configuration from database
    console.log('🔍 Fetching Midtrans gateway configuration from database...')
    const { data: midtransGateway, error: gatewayError } = await supabase
      .from('indb_payment_gateways')
      .select('id, configuration, api_credentials')
      .eq('slug', 'midtrans')
      .eq('is_active', true)
      .single()

    if (gatewayError || !midtransGateway) {
      console.log('❌ Failed to fetch Midtrans gateway configuration:', gatewayError)
      return NextResponse.json(
        { success: false, message: 'Midtrans payment gateway not configured' },
        { status: 500 }
      )
    }

    console.log('✅ Midtrans gateway configuration fetched successfully')
    const { server_key, client_key, merchant_id } = midtransGateway.api_credentials
    const { environment } = midtransGateway.configuration

    if (!server_key || !client_key) {
      console.log('❌ Missing Midtrans API credentials in database')
      return NextResponse.json(
        { success: false, message: 'Midtrans API credentials not properly configured' },
        { status: 500 }
      )
    }

    // Get package details
    const { data: packageData, error: packageError } = await supabase
      .from('indb_payment_packages')
      .select('*')
      .eq('id', package_id)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { success: false, message: 'Package not found' },
        { status: 404 }
      )
    }

    // Use the already fetched Midtrans gateway data
    const gatewayData = midtransGateway

    // Calculate price based on billing period
    const pricingTiers = packageData.pricing_tiers || {}
    const regularPrice = pricingTiers.regular?.[billing_period] || packageData.price
    const promoPrice = pricingTiers.promo?.[billing_period]
    const finalPrice = promoPrice || regularPrice

    // Generate unique order ID
    const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Initialize Midtrans service with credentials from database
    console.log('🏗️ Initializing Midtrans service with database credentials')
    const midtransService = createMidtransService({
      server_key,
      client_key,
      environment,
      merchant_id
    })

    console.log('💳 Step 1: Creating initial charge to get saved_token_id...')
    
    // Step 1: Create charge transaction to get saved_token_id
    const chargeTransaction = await midtransService.createChargeTransaction({
      order_id: orderId,
      amount_usd: finalPrice,
      token_id: token_id,
      customer_details: {
        first_name: customer_info.first_name,
        last_name: customer_info.last_name,
        email: customer_info.email,
        phone: customer_info.phone,
      },
      item_details: {
        name: packageData.name,
        description: packageData.description,
      },
    })

    console.log('📋 Charge transaction result:', {
      transaction_id: chargeTransaction.transaction_id,
      transaction_status: chargeTransaction.transaction_status,
      fraud_status: chargeTransaction.fraud_status,
      has_saved_token: !!chargeTransaction.saved_token_id
    })

    // Check if charge was successful
    if (chargeTransaction.transaction_status !== 'capture' && chargeTransaction.transaction_status !== 'settlement') {
      throw new Error(`Charge transaction failed: ${chargeTransaction.status_message}`)
    }

    // Get saved_token_id from charge response
    let savedTokenId = chargeTransaction.saved_token_id
    let maskedCard = chargeTransaction.masked_card

    if (!savedTokenId) {
      console.log('🔍 saved_token_id not in charge response, checking transaction status...')
      const transactionStatus = await midtransService.getTransactionStatus(chargeTransaction.transaction_id)
      savedTokenId = transactionStatus.saved_token_id
      maskedCard = transactionStatus.masked_card
    }

    if (!savedTokenId) {
      throw new Error('Card token was not saved from transaction. Please try again.')
    }

    console.log('✅ Got saved_token_id:', savedTokenId)

    // Step 2: Save the token in dedicated table
    const { data: savedTokenData, error: tokenError } = await supabase
      .from('indb_midtrans_saved_tokens')
      .upsert({
        user_id: user.id,
        saved_token_id: savedTokenId,
        masked_card: maskedCard || 'Unknown',
        card_type: chargeTransaction.card_type || 'credit',
        bank: chargeTransaction.bank || 'Unknown',
        token_expired_at: chargeTransaction.saved_token_id_expired_at ? new Date(chargeTransaction.saved_token_id_expired_at).toISOString() : null,
        is_active: true,
        metadata: {
          transaction_id: chargeTransaction.transaction_id,
          order_id: orderId,
        }
      })
      .select()
      .single()

    if (tokenError) {
      console.warn('⚠️ Failed to save token to database:', tokenError)
      // Don't fail the whole transaction, just log the warning
    }

    console.log('💳 Step 2: Creating subscription with saved_token_id...')
    
    // Step 3: Create subscription using the saved_token_id
    const subscription = await midtransService.createSubscription(finalPrice, {
      name: `${packageData.name}_${billing_period}`.toUpperCase(),
      token: savedTokenId,
      schedule: {
        interval: 1,
        interval_unit: billing_period === 'monthly' ? 'month' : 'month',
        max_interval: billing_period === 'monthly' ? 12 : 1,
        start_time: new Date(Date.now() + (billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
      },
      customer_details: {
        first_name: customer_info.first_name,
        last_name: customer_info.last_name,
        email: customer_info.email,
        phone: customer_info.phone,
      },
      metadata: {
        user_id: user.id,
        package_id: package_id,
        billing_period: billing_period,
        order_id: orderId,
      },
    })

    console.log('✅ Subscription created:', subscription.id)

    // Combine results for compatibility
    const recurringPayment = {
      initial_charge: {
        ...chargeTransaction,
        saved_token_id: savedTokenId,
        masked_card: maskedCard,
      },
      subscription: subscription,
    }

    // Create transaction record in database
    const { data: transactionData, error: transactionError } = await supabase
      .from('indb_payment_transactions')
      .insert({
        user_id: user.id,
        package_id: package_id,
        gateway_id: gatewayData.id,
        transaction_type: 'subscription',
        transaction_status: 'completed',
        amount: finalPrice,
        currency: 'USD',
        payment_method: 'credit_card',
        payment_reference: recurringPayment.initial_charge.transaction_id,
        gateway_transaction_id: recurringPayment.initial_charge.transaction_id,
        gateway_order_id: orderId,
        billing_period: billing_period,
        customer_info: customer_info,
        gateway_response: recurringPayment.initial_charge,
        metadata: {
          subscription_id: recurringPayment.subscription.id,
          saved_token_id: recurringPayment.initial_charge.saved_token_id,
          masked_card: recurringPayment.initial_charge.masked_card,
          subscription_status: recurringPayment.subscription.status,
          next_execution_at: recurringPayment.subscription.schedule.next_execution_at,
        },
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Failed to create transaction record:', transactionError)
      return NextResponse.json(
        { success: false, message: 'Failed to save transaction' },
        { status: 500 }
      )
    }

    // Create subscription record
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('indb_payment_subscriptions')
      .insert({
        user_id: user.id,
        package_id: package_id,
        transaction_id: transactionData.id,
        subscription_status: 'active',
        billing_period: billing_period,
        amount_paid: finalPrice,
        currency: 'USD',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
        auto_renew: true,
        payment_reference: recurringPayment.subscription.id,
        metadata: {
          midtrans_subscription_id: recurringPayment.subscription.id,
          saved_token_id: recurringPayment.initial_charge.saved_token_id,
          masked_card: recurringPayment.initial_charge.masked_card,
        },
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Failed to create subscription record:', subscriptionError)
    }

    // Update user package
    const { error: userUpdateError } = await supabase
      .from('indb_auth_user_profiles')
      .update({
        package_id: package_id,
        subscribed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('user_id', user.id)

    if (userUpdateError) {
      console.error('Failed to update user profile:', userUpdateError)
    }

    return NextResponse.json({
      success: true,
      message: 'Recurring payment setup successfully',
      data: {
        transaction_id: transactionData.id,
        subscription_id: subscriptionData?.id,
        midtrans_subscription_id: recurringPayment.subscription.id,
        order_id: orderId,
        amount: finalPrice,
        currency: 'USD',
        billing_period: billing_period,
        next_billing_date: recurringPayment.subscription.schedule.next_execution_at,
        masked_card: recurringPayment.initial_charge.masked_card,
        redirect_url: `/dashboard/settings/plans-billing/orders/${transactionData.id}`,
      },
    })

  } catch (error) {
    console.error('Midtrans recurring payment error:', error)
    
    let errorMessage = 'Payment processing failed'
    if (error instanceof Error) {
      if (error.message.includes('Initial charge failed')) {
        errorMessage = 'Payment failed. Please check your card details and try again.'
      } else if (error.message.includes('Card token was not saved')) {
        errorMessage = 'Card could not be saved for recurring payments. Please try again.'
      } else if (error.message.includes('Midtrans API Error')) {
        errorMessage = 'Payment gateway error. Please try again or contact support.'
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    )
  }
}