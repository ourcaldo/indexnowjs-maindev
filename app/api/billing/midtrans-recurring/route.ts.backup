import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createMidtransService } from '@/lib/midtrans-service'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  console.log('\n🚀 ================== MIDTRANS RECURRING PAYMENT STARTED ==================')
  console.log('⏰ Timestamp:', new Date().toISOString())
  
  try {
    // Get authenticated user from Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔐 Auth header check - Present:', !!authHeader)
    
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

    console.log('📥 Starting to parse request body...')
    const body = await request.json()
    console.log('✅ Request body parsed successfully')
    console.log('📝 Request body summary:', { 
      package_id: body.package_id, 
      billing_period: body.billing_period,
      has_customer_info: !!body.customer_info,
      has_token_id: !!body.token_id,
      token_id_length: body.token_id?.length || 0,
      token_id_preview: body.token_id ? body.token_id.substring(0, 20) + '...' : 'none'
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

    console.log('🔍 Validating required fields...')
    console.log('📋 Field validation:', {
      package_id: !!package_id,
      billing_period: !!billing_period,
      customer_info: !!customer_info,
      token_id: !!token_id,
      token_id_length: token_id?.length || 0
    })
    
    if (!token_id || typeof token_id !== 'string' || token_id.length < 10) {
      console.log('❌ Invalid token_id')
      return NextResponse.json(
        { success: false, message: 'Valid card token is required' },
        { status: 400 }
      )
    }

    // Get Midtrans payment gateway configuration from database
    console.log('🏪 Fetching Midtrans gateway configuration from database...')
    console.log('⏳ Database query starting...')
    const { data: midtransGateway, error: gatewayError } = await supabase
      .from('indb_payment_gateways')
      .select('id, configuration, api_credentials')
      .eq('slug', 'midtrans')
      .eq('is_active', true)
      .single()
    
    console.log('✅ Database query completed')
    console.log('📊 Gateway query result:', {
      found: !!midtransGateway,
      error: !!gatewayError,
      error_message: gatewayError?.message
    })

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
    console.log('📦 Fetching package details for ID:', package_id)
    const { data: packageData, error: packageError } = await supabase
      .from('indb_payment_packages')
      .select('*')
      .eq('id', package_id)
      .single()
    
    console.log('📦 Package query result:', {
      found: !!packageData,
      error: !!packageError,
      package_name: packageData?.name
    })

    if (packageError || !packageData) {
      return NextResponse.json(
        { success: false, message: 'Package not found' },
        { status: 404 }
      )
    }

    // Use the already fetched Midtrans gateway data
    const gatewayData = midtransGateway

    // Calculate price based on billing period - handle nested currency structure
    const pricingTiers = packageData.pricing_tiers || {}
    
    // Access pricing tiers: pricing_tiers[billing_period][currency][promo_price/regular_price]
    const periodPricing = pricingTiers[billing_period]
    const usdPricing = periodPricing?.USD
    const regularPrice = usdPricing?.regular_price || packageData.price
    const promoPrice = usdPricing?.promo_price
    const finalPrice = promoPrice || regularPrice
    
    // DEBUG: Check pricing calculation
    console.log('🔍 PRICING DEBUG:')
    console.log('  packageData.name:', packageData.name)
    console.log('  packageData.price:', packageData.price)
    console.log('  billing_period:', billing_period)
    console.log('  periodPricing:', periodPricing)
    console.log('  usdPricing:', usdPricing)
    console.log('  regularPrice:', regularPrice)
    console.log('  promoPrice:', promoPrice)
    console.log('  finalPrice:', finalPrice)

    // Generate unique order ID
    const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Initialize Midtrans service with credentials from database
    console.log('🏗️ Initializing Midtrans service...')
    console.log('🔧 Service config:', {
      has_server_key: !!server_key,
      has_client_key: !!client_key,
      environment: environment,
      has_merchant_id: !!merchant_id
    })
    
    const midtransService = createMidtransService({
      server_key,
      client_key,
      environment,
      merchant_id
    })
    
    console.log('✅ Midtrans service initialized successfully')

    console.log('\n💳 ============= STEP 1: CREATING CHARGE TRANSACTION =============')
    console.log('🎯 Order ID:', orderId)
    console.log('💰 Final price (USD):', finalPrice)
    console.log('🔑 Token ID preview:', token_id.substring(0, 20) + '...')
    
    // Step 1: Create charge transaction to get saved_token_id
    console.log('⏳ Calling midtransService.createChargeTransaction...')
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

    console.log('✅ Charge transaction completed!')
    console.log('📋 Charge transaction result:', {
      transaction_id: chargeTransaction.transaction_id,
      order_id: chargeTransaction.order_id,
      transaction_status: chargeTransaction.transaction_status,
      fraud_status: chargeTransaction.fraud_status,
      status_code: chargeTransaction.status_code,
      status_message: chargeTransaction.status_message,
      has_saved_token: !!chargeTransaction.saved_token_id,
      saved_token_preview: chargeTransaction.saved_token_id ? chargeTransaction.saved_token_id.substring(0, 20) + '...' : 'none',
      masked_card: chargeTransaction.masked_card,
      has_redirect_url: !!(chargeTransaction as any).redirect_url
    })

    // Check if 3DS authentication is required
    if ((chargeTransaction as any).redirect_url) {
      console.log('🔐 3DS Authentication required, creating pending transaction record first...')
      
      // Create pending transaction record so 3DS callback can access customer info
      const { data: pendingTransaction, error: pendingError } = await supabase
        .from('indb_payment_transactions')
        .insert({
          user_id: user.id,
          package_id: package_id,
          gateway_id: midtransGateway.id,
          transaction_type: 'subscription',
          transaction_status: 'pending_3ds',
          amount: finalPrice,
          currency: 'USD',
          payment_method: 'credit_card',
          payment_reference: chargeTransaction.order_id,
          gateway_transaction_id: chargeTransaction.transaction_id,
          gateway_response: chargeTransaction,
          billing_period: billing_period,
          metadata: {
            order_id: chargeTransaction.order_id,
            customer_info: customer_info, // CRITICAL: Save original customer info
            package_details: {
              id: packageData.id,
              name: packageData.name,
              price: finalPrice
            },
            billing_period: billing_period,
            processing_method: '3ds_pending',
            requires_3ds: true
          },
        })
        .select()
        .single()

      if (pendingError) {
        console.error('❌ Failed to create pending transaction record:', pendingError)
        // Continue anyway, 3DS callback will use fallback
      } else {
        console.log('✅ Pending transaction record created:', pendingTransaction.id)
      }
      
      console.log('🔐 Returning redirect URL to frontend')
      return NextResponse.json({
        success: true,
        requires_3ds: true,
        redirect_url: (chargeTransaction as any).redirect_url,
        order_id: chargeTransaction.order_id,
        transaction_id: chargeTransaction.transaction_id,
        message: '3DS authentication required'
      })
    }

    // Check if charge was successful (for non-3DS transactions)
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

    console.log('\n🔄 ============= STEP 2: CREATING SUBSCRIPTION =============')
    console.log('🔑 Using saved_token_id:', savedTokenId.substring(0, 20) + '...')
    console.log('💰 Subscription amount (USD):', finalPrice)
    console.log('📅 Billing period:', billing_period)
    
    // Step 3: Create subscription using the saved_token_id
    console.log('⏳ Calling midtransService.createSubscription...')
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

    console.log('✅ Subscription created successfully!')
    console.log('📋 Subscription result:', {
      subscription_id: subscription.id,
      name: subscription.name,
      status: subscription.status,
      amount: subscription.amount,
      currency: subscription.currency,
      next_execution: subscription.schedule?.next_execution_at,
      created_at: subscription.created_at
    })

    // Combine results for compatibility
    const recurringPayment = {
      initial_charge: {
        ...chargeTransaction,
        saved_token_id: savedTokenId,
        masked_card: maskedCard,
      },
      subscription: subscription,
    }

    console.log('\n💾 ============= STEP 3: SAVING TO DATABASE =============')
    
    // Create transaction record in database
    console.log('📝 Creating transaction record in indb_payment_transactions...')
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
        billing_period: billing_period,
        gateway_response: recurringPayment.initial_charge,
        metadata: {
          subscription_id: recurringPayment.subscription.id,
          saved_token_id: recurringPayment.initial_charge.saved_token_id,
          masked_card: recurringPayment.initial_charge.masked_card,
          subscription_status: recurringPayment.subscription.status,
          next_execution_at: recurringPayment.subscription.schedule.next_execution_at,
          customer_info: customer_info,
          order_id: orderId
        },
      })
      .select()
      .single()

    if (transactionError) {
      console.error('❌ TRANSACTION RECORD CREATION FAILED:', transactionError)
      return NextResponse.json(
        { success: false, message: 'Failed to save transaction' },
        { status: 500 }
      )
    }
    
    console.log('✅ Transaction record created:', transactionData.id)

    // Create Midtrans-specific data record linked to main transaction
    console.log('📝 Creating Midtrans record in indb_payment_midtrans...')
    const { data: midtransData, error: midtransError } = await supabase
      .from('indb_payment_midtrans')
      .insert({
        transaction_id: transactionData.id, // Link to main transaction record
        user_id: user.id,
        midtrans_subscription_id: subscription.id,
        saved_token_id: savedTokenId,
        masked_card: maskedCard || 'Unknown',
        card_type: chargeTransaction.card_type || 'credit',
        bank: chargeTransaction.bank || 'Unknown',
        token_expired_at: chargeTransaction.saved_token_id_expired_at ? new Date(chargeTransaction.saved_token_id_expired_at).toISOString() : null,
        subscription_status: 'active',
        next_billing_date: subscription.schedule?.next_execution_at ? new Date(subscription.schedule.next_execution_at).toISOString() : null,
        metadata: {
          midtrans_transaction_id: chargeTransaction.transaction_id,
          order_id: orderId,
          subscription_name: subscription.name,
          schedule: subscription.schedule,
        }
      })
      .select()
      .single()

    if (midtransError) {
      console.warn('⚠️ Failed to create Midtrans data record:', midtransError)
      // Don't fail the whole transaction, just log the warning
    } else {
      console.log('✅ Midtrans data record created:', midtransData.id)
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

    console.log('\n🎉 ============= SUCCESS: PAYMENT COMPLETED =============')
    const responseData = {
      success: true,
      message: 'Recurring payment setup successfully',
      data: {
        transaction_id: transactionData.id,
        midtrans_subscription_id: subscription.id,
        order_id: orderId,
        amount: finalPrice,
        currency: 'USD',
        billing_period: billing_period,
        next_billing_date: subscription.schedule?.next_execution_at,
        masked_card: maskedCard,
        redirect_url: `/dashboard/settings/plans-billing/orders/${transactionData.id}`,
      },
    }
    
    console.log('📤 Sending success response:', JSON.stringify(responseData, null, 2))
    console.log('🏁 ================== MIDTRANS PAYMENT COMPLETED ==================\n')
    
    return NextResponse.json(responseData)

  } catch (error) {
    console.error('\n❌ ============= ERROR: PAYMENT FAILED =============')
    console.error('💥 Error details:', error)
    console.error('📍 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
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