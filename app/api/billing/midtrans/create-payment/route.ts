import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createMidtransService } from '@/lib/midtrans-service'
import { convertUsdToIdr } from '@/lib/currency-converter'

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

    const body = await request.json()
    const { package_id, billing_period, customer_info } = body

    if (!package_id || !billing_period || !customer_info) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get package details
    const { data: packageData, error: packageError } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('id', package_id)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    // Get Midtrans gateway configuration
    const { data: gatewayData, error: gatewayError } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'midtrans')
      .eq('is_active', true)
      .single()

    if (gatewayError || !gatewayData) {
      return NextResponse.json(
        { error: 'Midtrans gateway not configured or inactive' },
        { status: 404 }
      )
    }

    // Calculate price based on billing period
    const pricingTiers = packageData.pricing_tiers || {}
    let usdAmount = packageData.price

    if (pricingTiers[billing_period]?.USD) {
      const usdTier = pricingTiers[billing_period].USD
      usdAmount = usdTier.promo_price || usdTier.regular_price
    }

    // Convert USD to IDR
    const idrAmount = await convertUsdToIdr(usdAmount)

    // Generate unique order ID
    const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create Midtrans service
    const midtransService = createMidtransService(gatewayData)

    // Create Snap payment
    const snapPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: idrAmount
      },
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: customer_info.first_name,
        last_name: customer_info.last_name,
        email: customer_info.email,
        phone: customer_info.phone,
        billing_address: {
          first_name: customer_info.first_name,
          last_name: customer_info.last_name,
          email: customer_info.email,
          phone: customer_info.phone,
          address: customer_info.address,
          city: customer_info.city,
          postal_code: customer_info.zip_code,
          country_code: customer_info.country === 'Indonesia' ? 'IDN' : 'USA'
        }
      },
      item_details: [{
        id: packageData.id,
        price: idrAmount,
        quantity: 1,
        name: `${packageData.name} - ${billing_period}`,
        category: 'Subscription'
      }],
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/plans-billing/payment-success?order_id=${orderId}`,
        error: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/plans-billing/payment-failed?order_id=${orderId}`,
        pending: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/settings/plans-billing/payment-pending?order_id=${orderId}`
      },
      metadata: {
        user_id: user.id,
        package_id: package_id,
        billing_period: billing_period,
        usd_amount: usdAmount,
        idr_amount: idrAmount
      }
    }

    // Create Snap token
    const snapBaseUrl = gatewayData.configuration?.environment === 'production' 
      ? 'https://app.midtrans.com' 
      : 'https://app.sandbox.midtrans.com'

    const snapResponse = await fetch(`${snapBaseUrl}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(gatewayData.api_credentials.server_key + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(snapPayload)
    })

    if (!snapResponse.ok) {
      const errorData = await snapResponse.json().catch(() => ({}))
      console.error('Midtrans Snap error:', errorData)
      return NextResponse.json(
        { error: 'Failed to create payment', details: errorData },
        { status: 500 }
      )
    }

    const snapData = await snapResponse.json()

    // Create transaction record in database
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .insert({
        user_id: user.id,
        package_id: package_id,
        gateway_id: gatewayData.id,
        transaction_type: 'subscription',
        transaction_status: 'pending',
        amount: usdAmount,
        currency: 'USD',
        payment_method: 'credit_card',
        payment_reference: orderId,
        gateway_transaction_id: snapData.token,
        billing_period: billing_period, // Store billing period if column exists
        gateway_response: {
          snap_token: snapData.token,
          snap_redirect_url: snapData.redirect_url,
          idr_amount: idrAmount,
          order_id: orderId
        },
        metadata: {
          midtrans_order_id: orderId,
          snap_token: snapData.token,
          billing_period: billing_period, // Always store in metadata as backup
          usd_amount: usdAmount,
          idr_amount: idrAmount,
          customer_info: customer_info
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Transaction creation error:', transactionError)
      return NextResponse.json(
        { error: 'Failed to create transaction record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        transaction_id: transaction.id,
        order_id: orderId,
        snap_token: snapData.token,
        snap_redirect_url: snapData.redirect_url,
        amount: {
          usd: usdAmount,
          idr: idrAmount
        }
      }
    })

  } catch (error: any) {
    console.error('Create Midtrans payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}