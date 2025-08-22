import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { supabaseAdmin } from '@/lib/supabase'
import { createMidtransService } from '@/lib/midtrans-service'

export default class MidtransRecurringHandler extends BasePaymentHandler {
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