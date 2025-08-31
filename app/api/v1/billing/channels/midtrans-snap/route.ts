import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { validatePaymentRequest, checkRateLimit, sanitizeInput, generateRequestId } from '../shared/validation'
import { supabaseAdmin } from '@/lib/database'

const midtransClient = require('midtrans-client')

class MidtransSnapHandler extends BasePaymentHandler {
  private gateway: any
  private snapClient: any

  getPaymentMethodSlug(): string {
    return 'midtrans_snap'
  }

  async processPayment(): Promise<PaymentResult> {
    // Get gateway configuration
    await this.loadGatewayConfig()
    
    // Calculate amount and convert to IDR if needed
    const amount = this.calculateAmount()
    let finalAmount = amount.finalAmount
    
    if (amount.originalCurrency === 'USD') {
      const { convertUsdToIdr } = await import('@/lib/utils/currency-converter')
      finalAmount = await convertUsdToIdr(amount.finalAmount)
    }

    // Generate order ID
    const orderId = `SNAP-${Date.now()}-${this.paymentData.user.id.slice(0, 8)}`

    // Create transaction record BEFORE Midtrans API call
    await this.createPendingTransaction(orderId, this.gateway.id, {
      payment_gateway_type: 'midtrans_snap',
      converted_amount: finalAmount,
      converted_currency: 'IDR'
    })

    // Create Snap transaction
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: finalAmount
      },
      credit_card: {
        secure: true
      },
      item_details: [{
        id: this.packageData.id,
        price: finalAmount,
        quantity: 1,
        name: `${this.packageData.name} - ${this.paymentData.billing_period}`,
        category: "subscription"
      }],
      customer_details: {
        first_name: this.paymentData.customer_info.first_name,
        last_name: this.paymentData.customer_info.last_name,
        email: this.paymentData.customer_info.email,
        phone: this.paymentData.customer_info.phone || ''
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/plans-billing/orders/${orderId}`,
        error: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/plans-billing?payment=error`
      }
    }

    const transaction = await this.snapClient.createTransaction(parameter)

    // Update transaction with Midtrans response
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

    return {
      success: true,
      data: {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        client_key: this.gateway.api_credentials.client_key,
        environment: this.gateway.configuration.environment,
        order_id: orderId
      }
    }
  }

  private async loadGatewayConfig(): Promise<void> {
    const { data: gateway, error } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'midtrans_snap')
      .eq('is_active', true)
      .single()

    if (error || !gateway) {
      throw new Error('Midtrans Snap gateway not configured')
    }

    this.gateway = gateway
    this.snapClient = new midtransClient.Snap({
      isProduction: gateway.configuration.environment === 'production',
      serverKey: gateway.api_credentials.server_key,
      clientKey: gateway.api_credentials.client_key
    })
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  try {
    console.log(`🚀 [Midtrans Snap ${requestId}] Payment request initiated`)
    
    // Authentication
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
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
      console.error(`❌ [Midtrans Snap ${requestId}] Authentication failed:`, authError)
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required',
        request_id: requestId
      }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(`user:${user.id}:midtrans_snap`, 10, 15 * 60 * 1000)
    if (!rateLimitResult.allowed) {
      console.warn(`⚠️ [Midtrans Snap ${requestId}] Rate limit exceeded for user: ${user.id}`)
      return NextResponse.json({
        success: false,
        message: 'Too many payment attempts. Please try again later.',
        request_id: requestId,
        retry_after: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      }, { status: 429 })
    }

    // Enhanced validation
    const validation = await validatePaymentRequest(request)
    if (!validation.success) {
      console.error(`❌ [Midtrans Snap ${requestId}] Validation failed:`, validation.errors)
      return NextResponse.json({
        success: false,
        message: 'Invalid payment data',
        errors: validation.errors,
        request_id: requestId
      }, { status: 400 })
    }

    // Sanitize input data
    const sanitizedData = sanitizeInput(validation.data)
    
    const paymentData: PaymentData = {
      package_id: sanitizedData.package_id,
      billing_period: sanitizedData.billing_period,
      customer_info: sanitizedData.customer_info,
      user
    }

    console.log(`✅ [Midtrans Snap ${requestId}] Processing payment for user: ${user.id}, package: ${sanitizedData.package_id}`)
    
    const handler = new MidtransSnapHandler(paymentData)
    const result = await handler.execute()
    
    const duration = Date.now() - startTime
    console.log(`🎉 [Midtrans Snap ${requestId}] Payment processed successfully in ${duration}ms`)
    
    // Add request ID to response
    if (result.headers.get('content-type')?.includes('application/json')) {
      const body = await result.json()
      body.request_id = requestId
      body.processing_time_ms = duration
      return NextResponse.json(body, { status: result.status })
    }
    
    return result
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`💥 [Midtrans Snap ${requestId}] Critical error after ${duration}ms:`, error)
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      request_id: requestId,
      processing_time_ms: duration
    }, { status: 500 })
  }
}