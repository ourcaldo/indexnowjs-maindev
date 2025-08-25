import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { validatePaymentRequest, checkRateLimit, sanitizeInput, generateRequestId } from '../shared/validation'
import { supabaseAdmin } from '@/lib/database'
import { createMidtransService } from '@/lib/payment-services/midtrans-service'

class MidtransRecurringHandler extends BasePaymentHandler {
  private gateway: any
  private midtransService: any
  private tokenId: string

  constructor(paymentData: PaymentData, tokenId: string) {
    super(paymentData)
    this.tokenId = tokenId
  }

  getPaymentMethodSlug(): string {
    return 'midtrans_recurring'
  }

  async processPayment(): Promise<PaymentResult> {
    // Get gateway configuration
    await this.loadGatewayConfig()
    
    // Calculate amount
    const amount = this.calculateAmount()
    
    // Generate order ID
    const orderId = `ORDER-${Date.now()}-${this.paymentData.user.id.slice(0, 8)}`

    // Create transaction record BEFORE payment processing
    await this.createPendingTransaction(orderId, this.gateway.id, {
      payment_gateway_type: 'midtrans_recurring',
      token_id: this.tokenId
    })

    // Initialize Midtrans service
    this.midtransService = createMidtransService({
      server_key: this.gateway.api_credentials.server_key,
      client_key: this.gateway.api_credentials.client_key,
      environment: this.gateway.configuration.environment,
      merchant_id: this.gateway.api_credentials.merchant_id
    })

    // Step 1: Create charge transaction
    const chargeTransaction = await this.midtransService.createChargeTransaction({
      order_id: orderId,
      amount_usd: amount.finalAmount,
      token_id: this.tokenId,
      customer_details: {
        first_name: this.paymentData.customer_info.first_name,
        last_name: this.paymentData.customer_info.last_name,
        email: this.paymentData.customer_info.email,
        phone: this.paymentData.customer_info.phone,
      },
      item_details: {
        name: this.packageData.name,
        description: this.packageData.description,
      },
    })

    // Check if 3DS authentication is required
    if ((chargeTransaction as any).redirect_url) {
      // Update transaction status to pending_3ds
      await supabaseAdmin
        .from('indb_payment_transactions')
        .update({
          transaction_status: 'pending_3ds',
          gateway_transaction_id: chargeTransaction.transaction_id,
          gateway_response: chargeTransaction,
          metadata: {
            ...this.getTransactionMetadata(),
            requires_3ds: true
          }
        })
        .eq('payment_reference', orderId)

      return {
        success: true,
        requires_redirect: true,
        redirect_url: (chargeTransaction as any).redirect_url,
        data: {
          order_id: orderId,
          transaction_id: chargeTransaction.transaction_id,
          requires_3ds: true
        }
      }
    }

    // For successful charges, continue with subscription creation
    if (chargeTransaction.transaction_status === 'capture' || chargeTransaction.transaction_status === 'settlement') {
      const savedTokenId = chargeTransaction.saved_token_id

      if (!savedTokenId) {
        throw new Error('Card token was not saved from transaction')
      }

      // Create subscription
      const subscription = await this.midtransService.createSubscription(amount.finalAmount, {
        name: `${this.packageData.name}_${this.paymentData.billing_period}`.toUpperCase(),
        token: savedTokenId,
        schedule: {
          interval: 1,
          interval_unit: this.paymentData.billing_period === 'monthly' ? 'month' : 'month',
          max_interval: this.paymentData.billing_period === 'monthly' ? 12 : 1,
          start_time: new Date(Date.now() + (this.paymentData.billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
        },
        customer_details: {
          first_name: this.paymentData.customer_info.first_name,
          last_name: this.paymentData.customer_info.last_name,
          email: this.paymentData.customer_info.email,
          phone: this.paymentData.customer_info.phone,
        },
        metadata: {
          user_id: this.paymentData.user.id,
          package_id: this.paymentData.package_id,
          billing_period: this.paymentData.billing_period,
          order_id: orderId,
        },
      })

      // Update transaction to completed
      await supabaseAdmin
        .from('indb_payment_transactions')
        .update({
          transaction_status: 'completed',
          gateway_transaction_id: chargeTransaction.transaction_id,
          gateway_response: {
            charge: chargeTransaction,
            subscription: subscription
          },
          metadata: {
            ...this.getTransactionMetadata(),
            subscription_id: subscription.id,
            saved_token_id: savedTokenId,
            masked_card: chargeTransaction.masked_card
          }
        })
        .eq('payment_reference', orderId)

      // Update user subscription
      await this.updateUserSubscription(subscription, amount.finalAmount)

      return {
        success: true,
        data: {
          order_id: orderId,
          transaction_id: chargeTransaction.transaction_id,
          subscription_id: subscription.id,
          redirect_url: `/dashboard/settings/plans-billing/orders/${orderId}`
        }
      }
    }

    throw new Error(`Charge transaction failed: ${chargeTransaction.status_message}`)
  }

  private async loadGatewayConfig(): Promise<void> {
    const { data: gateway, error } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'midtrans')
      .eq('is_active', true)
      .single()

    if (error || !gateway) {
      throw new Error('Midtrans recurring gateway not configured')
    }

    this.gateway = gateway
  }

  private getTransactionMetadata() {
    return {
      order_id: this.paymentData.user.id,
      customer_info: this.paymentData.customer_info,
      package_details: {
        id: this.packageData.id,
        name: this.packageData.name,
        price: this.calculateAmount().finalAmount
      },
      billing_period: this.paymentData.billing_period,
      processing_method: 'recurring'
    }
  }

  private async updateUserSubscription(subscription: any, amount: number): Promise<void> {
    await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        package_id: this.paymentData.package_id,
        subscribed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (this.paymentData.billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('user_id', this.paymentData.user.id)
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  try {
    console.log(`🚀 [Midtrans Recurring ${requestId}] Payment request initiated`)
    
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
      console.error(`❌ [Midtrans Recurring ${requestId}] Authentication failed:`, authError)
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required',
        request_id: requestId
      }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(`user:${user.id}:midtrans_recurring`, 10, 15 * 60 * 1000)
    if (!rateLimitResult.allowed) {
      console.warn(`⚠️ [Midtrans Recurring ${requestId}] Rate limit exceeded for user: ${user.id}`)
      return NextResponse.json({
        success: false,
        message: 'Too many payment attempts. Please try again later.',
        request_id: requestId,
        retry_after: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      }, { status: 429 })
    }

    const body = await request.json()
    const { token_id, ...restBody } = body

    if (!token_id) {
      console.error(`❌ [Midtrans Recurring ${requestId}] Missing token_id`)
      return NextResponse.json({
        success: false,
        message: 'Valid card token is required',
        request_id: requestId
      }, { status: 400 })
    }

    // Enhanced validation
    const validation = await validatePaymentRequest(request)
    if (!validation.success) {
      console.error(`❌ [Midtrans Recurring ${requestId}] Validation failed:`, validation.errors)
      return NextResponse.json({
        success: false,
        message: 'Invalid payment data',
        errors: validation.errors,
        request_id: requestId
      }, { status: 400 })
    }

    // Sanitize input data
    const sanitizedData = sanitizeInput(restBody)
    
    const paymentData: PaymentData = {
      package_id: sanitizedData.package_id,
      billing_period: sanitizedData.billing_period,
      customer_info: sanitizedData.customer_info,
      user
    }

    console.log(`✅ [Midtrans Recurring ${requestId}] Processing payment for user: ${user.id}, package: ${sanitizedData.package_id}`)
    
    const handler = new MidtransRecurringHandler(paymentData, token_id)
    const result = await handler.execute()
    
    const duration = Date.now() - startTime
    console.log(`🎉 [Midtrans Recurring ${requestId}] Payment processed successfully in ${duration}ms`)
    
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
    console.error(`💥 [Midtrans Recurring ${requestId}] Critical error after ${duration}ms:`, error)
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      request_id: requestId,
      processing_time_ms: duration
    }, { status: 500 })
  }
}