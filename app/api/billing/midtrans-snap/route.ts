import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const midtransClient = require('midtrans-client')

// Zod schema for request validation
const snapRequestSchema = z.object({
  package_id: z.string().uuid(),
  billing_period: z.enum(['monthly', 'annual']),
  user_data: z.object({
    full_name: z.string(),
    email: z.string().email(),
    phone_number: z.string().optional(),
    country: z.string().optional()
  })
})

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [Midtrans Snap] Starting payment token creation')
    
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
      console.log('❌ [Midtrans Snap] Authentication failed:', authError?.message || 'No user')
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('✅ [Midtrans Snap] User authenticated:', user.email)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = snapRequestSchema.parse(body)
    
    console.log('📊 [Midtrans Snap] Validated request data:', {
      package_id: validatedData.package_id,
      billing_period: validatedData.billing_period,
      user_email: validatedData.user_data.email
    })

    // Fetch package details
    const { data: packageData, error: packageError } = await supabaseAdmin
      .from('indb_packages')
      .select('*')
      .eq('id', validatedData.package_id)
      .eq('is_active', true)
      .single()

    if (packageError || !packageData) {
      console.log('❌ [Midtrans Snap] Package not found:', packageError?.message)
      return NextResponse.json(
        { success: false, message: 'Package not found or inactive' },
        { status: 404 }
      )
    }

    console.log('✅ [Midtrans Snap] Package fetched:', packageData.name)

    // Calculate pricing
    let amount = 0
    let packageName = packageData.name

    if (packageData.pricing_tiers && packageData.pricing_tiers[validatedData.billing_period]) {
      const periodTier = packageData.pricing_tiers[validatedData.billing_period]
      if (periodTier.IDR) {
        amount = periodTier.IDR.promo_price || periodTier.IDR.regular_price
      }
    }

    if (!amount || amount <= 0) {
      console.log('❌ [Midtrans Snap] Invalid package pricing')
      return NextResponse.json(
        { success: false, message: 'Invalid package pricing' },
        { status: 400 }
      )
    }

    console.log('💰 [Midtrans Snap] Calculated amount:', amount, 'IDR')

    // Fetch Midtrans Snap gateway configuration
    const { data: snapGateway, error: gatewayError } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'midtrans_snap')
      .eq('is_active', true)
      .single()

    if (gatewayError || !snapGateway) {
      console.log('❌ [Midtrans Snap] Gateway configuration not found:', gatewayError?.message)
      return NextResponse.json(
        { success: false, message: 'Midtrans Snap gateway not configured' },
        { status: 500 }
      )
    }

    console.log('✅ [Midtrans Snap] Gateway configuration loaded')

    const { server_key, client_key, merchant_id } = snapGateway.api_credentials
    const { environment } = snapGateway.configuration

    if (!server_key || !client_key) {
      console.log('❌ [Midtrans Snap] Missing API credentials')
      return NextResponse.json(
        { success: false, message: 'Midtrans Snap API credentials not properly configured' },
        { status: 500 }
      )
    }

    // Initialize Midtrans Snap client
    const snap = new midtransClient.Snap({
      isProduction: environment === 'production',
      serverKey: server_key,
      clientKey: client_key
    })

    console.log(`🔧 [Midtrans Snap] Initialized ${environment} environment`)

    // Generate unique order ID
    const orderId = `SNAP-${Date.now()}-${user.id.slice(0, 8)}`

    // Prepare transaction parameter for Snap
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      credit_card: {
        secure: true
      },
      item_details: [{
        id: validatedData.package_id,
        price: amount,
        quantity: 1,
        name: `${packageName} - ${validatedData.billing_period}`,
        category: "subscription"
      }],
      customer_details: {
        first_name: validatedData.user_data.full_name.split(' ')[0] || '',
        last_name: validatedData.user_data.full_name.split(' ').slice(1).join(' ') || '',
        email: validatedData.user_data.email,
        phone: validatedData.user_data.phone_number || '',
        billing_address: {
          first_name: validatedData.user_data.full_name.split(' ')[0] || '',
          last_name: validatedData.user_data.full_name.split(' ').slice(1).join(' ') || '',
          email: validatedData.user_data.email,
          phone: validatedData.user_data.phone_number || ''
        }
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/plans-billing?payment=success`,
        error: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/plans-billing?payment=error`
      },
      expiry: {
        unit: "minutes",
        duration: 30
      }
    }

    console.log('📋 [Midtrans Snap] Transaction parameters prepared:', {
      order_id: orderId,
      amount: amount,
      customer_email: validatedData.user_data.email
    })

    // Create Snap transaction
    const transaction = await snap.createTransaction(parameter)
    
    console.log('✅ [Midtrans Snap] Transaction token created successfully')
    console.log('🔗 [Midtrans Snap] Token:', transaction.token)
    console.log('🌐 [Midtrans Snap] Redirect URL:', transaction.redirect_url)

    // Store pending transaction in database
    const { error: insertError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .insert({
        id: orderId,
        user_id: user.id,
        package_id: validatedData.package_id,
        billing_period: validatedData.billing_period,
        amount: amount,
        currency: 'IDR',
        payment_method: 'midtrans_snap',
        status: 'pending',
        gateway_transaction_id: transaction.token,
        gateway_response: {
          token: transaction.token,
          redirect_url: transaction.redirect_url,
          snap_parameter: parameter
        }
      })

    if (insertError) {
      console.log('⚠️ [Midtrans Snap] Failed to store transaction:', insertError.message)
      // Continue anyway, transaction was created successfully
    } else {
      console.log('✅ [Midtrans Snap] Transaction stored in database')
    }

    return NextResponse.json({
      success: true,
      data: {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        order_id: orderId,
        amount: amount,
        client_key: client_key,
        environment: environment
      }
    })

  } catch (error: any) {
    console.error('💥 [Midtrans Snap] API Error:', error)
    console.error('🔍 [Midtrans Snap] Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    })

    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error during payment processing',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}