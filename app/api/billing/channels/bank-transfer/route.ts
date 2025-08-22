import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
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
    return NextResponse.json({ 
      success: false, 
      message: 'Authentication required' 
    }, { status: 401 })
  }

  const body = await request.json()
  const paymentData: PaymentData = {
    package_id: body.package_id,
    billing_period: body.billing_period,
    customer_info: body.customer_info,
    user
  }

  const handler = new BankTransferHandler(paymentData)
  return await handler.execute()
}