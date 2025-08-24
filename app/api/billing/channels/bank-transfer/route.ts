import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { validatePaymentRequest, checkRateLimit, sanitizeInput, generateRequestId } from '../shared/validation'
import { supabaseAdmin } from '@/lib/supabase'

class BankTransferHandler extends BasePaymentHandler {
  private gateway: any

  getPaymentMethodSlug(): string {
    return 'bank_transfer'
  }

  async processPayment(): Promise<PaymentResult> {
    // Get gateway configuration
    await this.loadGatewayConfig()
    
    // Calculate amount
    const amount = this.calculateAmount()
    
    // Generate order ID
    const orderId = `BT-${Date.now()}-${this.paymentData.user.id.slice(0, 8)}`

    // Create transaction record
    await this.createPendingTransaction(orderId, this.gateway.id, {
      payment_gateway_type: 'bank_transfer',
      bank_details: this.gateway.configuration
    })

    // Update transaction with bank transfer instructions
    await supabaseAdmin
      .from('indb_payment_transactions')
      .update({
        gateway_response: {
          order_id: orderId,
          bank_name: this.gateway.configuration.bank_name,
          account_name: this.gateway.configuration.account_name,
          account_number: this.gateway.configuration.account_number,
          amount: amount.finalAmount,
          currency: amount.currency,
          instructions: `Please transfer ${amount.finalAmount} ${amount.currency} to the account above and upload payment proof.`
        }
      })
      .eq('payment_reference', orderId)

    return {
      success: true,
      requires_redirect: true,
      redirect_url: `/dashboard/settings/plans-billing/order/${orderId}`,
      data: {
        order_id: orderId,
        bank_details: {
          bank_name: this.gateway.configuration.bank_name,
          account_name: this.gateway.configuration.account_name,
          account_number: this.gateway.configuration.account_number,
          amount: amount.finalAmount,
          currency: amount.currency
        }
      }
    }
  }

  private async loadGatewayConfig(): Promise<void> {
    const { data: gateway, error } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'bank_transfer')
      .eq('is_active', true)
      .single()

    if (error || !gateway) {
      throw new Error('Bank transfer gateway not configured')
    }

    this.gateway = gateway
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  try {
    console.log(`🚀 [Bank Transfer ${requestId}] Payment request initiated`)
    
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
      console.error(`❌ [Bank Transfer ${requestId}] Authentication failed:`, authError)
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required',
        request_id: requestId
      }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(`user:${user.id}:bank_transfer`, 10, 15 * 60 * 1000)
    if (!rateLimitResult.allowed) {
      console.warn(`⚠️ [Bank Transfer ${requestId}] Rate limit exceeded for user: ${user.id}`)
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
      console.error(`❌ [Bank Transfer ${requestId}] Validation failed:`, validation.errors)
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

    console.log(`✅ [Bank Transfer ${requestId}] Processing payment for user: ${user.id}, package: ${sanitizedData.package_id}`)
    
    const handler = new BankTransferHandler(paymentData)
    const result = await handler.execute()
    
    const duration = Date.now() - startTime
    console.log(`🎉 [Bank Transfer ${requestId}] Payment processed successfully in ${duration}ms`)
    
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
    console.error(`💥 [Bank Transfer ${requestId}] Critical error after ${duration}ms:`, error)
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      request_id: requestId,
      processing_time_ms: duration
    }, { status: 500 })
  }
}