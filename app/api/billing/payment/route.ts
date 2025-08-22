import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const midtransClient = require('midtrans-client')

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [Unified Payment] Starting payment processing')
    
    // Get authenticated user
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ [Unified Payment] Authentication failed:', authError)
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 })
    }

    console.log(`✅ [Unified Payment] User authenticated: ${user.email}`)

    // Parse request body
    const body = await request.json()
    const { payment_method, package_id, billing_period, customer_info, payment_gateway_id } = body

    console.log(`📊 [Unified Payment] Processing payment method: ${payment_method}`)

    // Route to appropriate payment handler based on payment method slug
    switch (payment_method) {
      case 'midtrans_snap':
        console.log('🔄 [Unified Payment] Routing to Midtrans Snap handler')
        return await handleMidtransSnap({
          package_id,
          billing_period,
          user_data: {
            full_name: `${customer_info.first_name} ${customer_info.last_name}`.trim(),
            email: customer_info.email,
            phone_number: customer_info.phone,
            country: customer_info.country
          }
        }, user)

      case 'bank_transfer':
      default:
        console.log(`🔄 [Unified Payment] Routing to regular checkout handler for: ${payment_method}`)
        return await handleRegularCheckout({
          package_id,
          billing_period,
          payment_gateway_id,
          customer_info
        }, user)
    }

  } catch (error) {
    console.error('💥 [Unified Payment] Error processing payment:', error)
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Payment processing failed' 
    }, { status: 500 })
  }
}

// Midtrans Snap handler
async function handleMidtransSnap(data: any, user: any) {
  console.log('🌟 [Snap Handler] Processing Snap payment')
  
  try {
    // Validate required data
    const { package_id, billing_period, user_data } = data
    
    if (!package_id || !billing_period) {
      throw new Error('Missing required payment data')
    }

    console.log('📋 [Snap Handler] Validated request data:', { package_id, billing_period, user_email: user.email })

    // Get package details - use correct table name
    const { data: selectedPackage, error: packageError } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('id', package_id)
      .eq('is_active', true)
      .single()

    if (packageError || !selectedPackage) {
      console.error('❌ [Snap Handler] Package fetch error:', packageError)
      throw new Error('Package not found')
    }

    console.log('✅ [Snap Handler] Package fetched:', selectedPackage.name)

    // Calculate amount based on billing period - detect user currency
    let amount = 0
    // Import currency detection function
    const { getUserCurrency } = await import('@/lib/currency-utils')
    
    const userCurrency = getUserCurrency(user_data.country) // USD default, IDR for Indonesia
    console.log('💱 [Snap Handler] Currency detection:', {
      input_country: user_data.country,
      detected_currency: userCurrency
    })

    console.log('💰 [Snap Handler] Debug - Package pricing_tiers:', selectedPackage.pricing_tiers)
    console.log('💰 [Snap Handler] Debug - Billing period:', billing_period)
    console.log('💰 [Snap Handler] Debug - Package base price:', selectedPackage.price)

    // Try new pricing_tiers structure first
    if (selectedPackage.pricing_tiers && selectedPackage.pricing_tiers[billing_period]) {
      const periodTier = selectedPackage.pricing_tiers[billing_period]
      console.log('💰 [Snap Handler] Debug - Period tier found:', periodTier)
      
      if (periodTier[userCurrency]) {
        const currencyTier = periodTier[userCurrency]
        amount = currencyTier.promo_price || currencyTier.regular_price
        console.log('💰 [Snap Handler] Debug - Amount from new structure:', amount)
      }
    }
    
    // Fallback to old pricing structure if available
    if (amount === 0 && selectedPackage.pricing_tiers && selectedPackage.pricing_tiers.regular) {
      const regularTier = selectedPackage.pricing_tiers.regular[billing_period]
      const promoTier = selectedPackage.pricing_tiers.promo?.[billing_period]
      amount = promoTier || regularTier || 0
      console.log('💰 [Snap Handler] Debug - Amount from old structure:', amount)
    }
    
    // Final fallback to base price
    if (amount === 0) {
      amount = selectedPackage.price || 0
      console.log('💰 [Snap Handler] Debug - Amount from base price:', amount)
    }

    if (amount === 0) {
      console.error('❌ [Snap Handler] Pricing structure:', {
        pricing_tiers: selectedPackage.pricing_tiers,
        billing_period,
        base_price: selectedPackage.price,
        currency: userCurrency
      })
      throw new Error('Unable to calculate package amount - no pricing found')
    }

    console.log('💰 [Snap Handler] Final calculated amount:', amount, userCurrency)

    // Midtrans only accepts IDR, so convert USD to IDR if needed
    let finalAmount = amount
    if (userCurrency === 'USD') {
      const { convertUsdToIdr } = await import('@/lib/currency-converter')
      finalAmount = await convertUsdToIdr(amount)
      console.log('💱 [Snap Handler] Currency conversion:', {
        original_amount: amount,
        currency: 'USD',
        converted_amount: finalAmount,
        converted_currency: 'IDR'
      })
    }

    // Get Midtrans gateway configuration
    const { data: gateway, error: gatewayError } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'midtrans_snap')
      .eq('is_active', true)
      .single()

    if (gatewayError || !gateway) {
      console.error('❌ [Snap Handler] Gateway fetch error:', gatewayError)
      throw new Error('Midtrans Snap payment gateway not available')
    }

    console.log('✅ [Snap Handler] Gateway configuration loaded')

    const config = gateway.configuration as any
    const credentials = gateway.api_credentials as any
    const isProduction = config.environment === 'production'
    
    // Validate credentials
    if (!credentials.server_key || !credentials.client_key) {
      console.error('❌ [Snap Handler] Missing API credentials:', {
        has_server_key: !!credentials.server_key,
        has_client_key: !!credentials.client_key,
        configuration: config,
        credentials: credentials
      })
      throw new Error('Midtrans API credentials not configured properly')
    }
    
    console.log('🔑 [Snap Handler] API credentials validated')
    
    // Initialize Midtrans - get keys from api_credentials
    const snap = new midtransClient.Snap({
      isProduction,
      serverKey: credentials.server_key,
      clientKey: credentials.client_key
    })

    console.log('🔧 [Snap Handler] Initialized', isProduction ? 'production' : 'sandbox', 'environment')

    // Generate unique order ID
    const orderId = `SNAP-${Date.now()}-${user.id.split('-')[0]}`
    
    // Prepare transaction parameters
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: finalAmount
      },
      customer_details: {
        first_name: user_data.full_name.split(' ')[0] || 'Customer',
        last_name: user_data.full_name.split(' ').slice(1).join(' ') || '',
        email: user.email,
        phone: user_data.phone_number || ''
      },
      item_details: [{
        id: selectedPackage.id,
        price: finalAmount,
        quantity: 1,
        name: `${selectedPackage.name} Plan - ${billing_period}`
      }]
    }

    console.log('📋 [Snap Handler] Transaction parameters prepared:', {
      order_id: orderId,
      amount: finalAmount,
      currency: 'IDR',
      customer_email: user.email
    })

    // CREATE TRANSACTION RECORD FIRST - BEFORE CALLING MIDTRANS API
    console.log('💾 [Snap Handler] Creating transaction record BEFORE Midtrans API call...')
    const { error: dbError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .insert({
        user_id: user.id,
        package_id: selectedPackage.id,
        gateway_id: gateway.id,
        transaction_type: 'payment',
        transaction_status: 'pending',
        amount: finalAmount,
        currency: 'IDR',
        payment_method: 'midtrans_snap',
        payment_reference: orderId, // This is what webhook will search for
        billing_period,
        metadata: {
          original_amount: amount,
          original_currency: userCurrency,
          converted_amount: finalAmount,
          converted_currency: 'IDR',
          customer_info: user_data,
          payment_gateway_type: 'midtrans_snap' // Store in metadata for unified webhook detection
        }
      })

    if (dbError) {
      console.error('❌ [Snap Handler] Failed to create transaction record:', dbError)
      throw new Error('Failed to create transaction record')
    }
    
    console.log('✅ [Snap Handler] Transaction record created BEFORE API call')

    // NOW create transaction token with Midtrans
    const transaction = await snap.createTransaction(parameter)
    
    console.log('✅ [Snap Handler] Transaction token created successfully')
    console.log('🔗 [Snap Handler] Token:', transaction.token)
    console.log('🌐 [Snap Handler] Redirect URL:', transaction.redirect_url)

    // Update transaction with Midtrans response data
    await supabaseAdmin
      .from('indb_payment_transactions')
      .update({
        gateway_transaction_id: transaction.token,
        gateway_response: {
          token: transaction.token,
          redirect_url: transaction.redirect_url,
          snap_parameter: parameter
        }
      })
      .eq('payment_reference', orderId)
    
    console.log('✅ [Snap Handler] Transaction updated with Midtrans response')

    return NextResponse.json({
      success: true,
      message: 'Snap payment token created successfully',
      data: {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        client_key: credentials.client_key,
        environment: config.environment || 'sandbox',
        order_id: orderId
      }
    })

  } catch (error) {
    console.error('💥 [Snap Handler] Error:', error)
    throw error
  }
}

// Regular checkout handler (bank transfer, etc.)
async function handleRegularCheckout(data: any, user: any) {
  console.log('🏦 [Regular Checkout] Processing regular payment')
  
  try {
    const { package_id, billing_period, payment_gateway_id, customer_info } = data

    // Get package details
    const { data: selectedPackage, error: packageError } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('id', package_id)
      .eq('is_active', true)
      .single()

    if (packageError || !selectedPackage) {
      throw new Error('Package not found')
    }

    // Get payment gateway details
    const { data: gateway, error: gatewayError } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('id', payment_gateway_id)
      .single()

    if (gatewayError || !gateway) {
      throw new Error('Payment gateway not found')
    }

    console.log('✅ [Regular Checkout] Package and gateway loaded')

    // Calculate amount with same logic as Snap handler - detect user currency
    let amount = 0
    // Import currency detection function
    const { getUserCurrency } = await import('@/lib/currency-utils')
    const userCurrency = getUserCurrency(customer_info.country) // USD default, IDR for Indonesia

    console.log('💰 [Regular Checkout] Debug - Package pricing_tiers:', selectedPackage.pricing_tiers)
    console.log('💰 [Regular Checkout] Debug - Billing period:', billing_period)
    console.log('💰 [Regular Checkout] Debug - Package base price:', selectedPackage.price)

    // Try new pricing_tiers structure first
    if (selectedPackage.pricing_tiers && selectedPackage.pricing_tiers[billing_period]) {
      const periodTier = selectedPackage.pricing_tiers[billing_period]
      console.log('💰 [Regular Checkout] Debug - Period tier found:', periodTier)
      
      if (periodTier[userCurrency]) {
        const currencyTier = periodTier[userCurrency]
        amount = currencyTier.promo_price || currencyTier.regular_price
        console.log('💰 [Regular Checkout] Debug - Amount from new structure:', amount)
      }
    }
    
    // Fallback to old pricing structure if available
    if (amount === 0 && selectedPackage.pricing_tiers && selectedPackage.pricing_tiers.regular) {
      const regularTier = selectedPackage.pricing_tiers.regular[billing_period]
      const promoTier = selectedPackage.pricing_tiers.promo?.[billing_period]
      amount = promoTier || regularTier || 0
      console.log('💰 [Regular Checkout] Debug - Amount from old structure:', amount)
    }
    
    // Final fallback to base price
    if (amount === 0) {
      amount = selectedPackage.price || 0
      console.log('💰 [Regular Checkout] Debug - Amount from base price:', amount)
    }

    if (amount === 0) {
      console.error('❌ [Regular Checkout] Pricing structure:', {
        pricing_tiers: selectedPackage.pricing_tiers,
        billing_period,
        base_price: selectedPackage.price,
        currency: userCurrency
      })
      throw new Error('Unable to calculate package amount - no pricing found')
    }

    console.log('💰 [Regular Checkout] Final calculated amount:', amount, userCurrency)

    // Generate unique order ID
    const orderId = `ORDER-${Date.now()}-${user.id.split('-')[0]}`

    // Create payment transaction
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .insert({
        id: orderId,
        user_id: user.id,
        package_id: selectedPackage.id,
        gateway_id: gateway.id,
        amount,
        currency: userCurrency,
        status: 'pending',
        billing_period,
        customer_info,
        metadata: {
          payment_method: gateway.slug
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('❌ [Regular Checkout] Transaction creation failed:', transactionError)
      throw new Error('Failed to create payment transaction')
    }

    console.log('✅ [Regular Checkout] Transaction created:', orderId)

    // Return success response with redirect URL
    const redirectUrl = `/dashboard/settings/plans-billing/orders/${orderId}`
    
    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      data: {
        order_id: orderId,
        redirect_url: redirectUrl,
        transaction
      }
    })

  } catch (error) {
    console.error('💥 [Regular Checkout] Error:', error)
    throw error
  }
}