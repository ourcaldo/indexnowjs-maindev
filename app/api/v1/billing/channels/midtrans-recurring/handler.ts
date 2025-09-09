import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { supabaseAdmin } from '@/lib/database'
import { PaymentServiceFactory } from '@/lib/services/payments'
import { emailService } from '@/lib/email/emailService'

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
    
    // Create transaction record BEFORE payment processing and get database-generated ID
    const trialMetadata = this.paymentData.is_trial ? {
      is_trial: true,
      trial_start_date: new Date().toISOString(),
      trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      trial_duration_days: 3,
      auto_billing_start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 1000).toISOString(), // 1 second after trial ends
      trial_package_slug: this.packageData?.slug,
      original_amount_usd: amount.originalAmount,
      converted_amount_idr: amount.finalAmount
    } : null;

    const { data: transaction, error: dbError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .insert({
        user_id: this.paymentData.user.id,
        package_id: this.paymentData.package_id,
        gateway_id: this.gateway.id,
        transaction_type: 'payment',
        transaction_status: 'pending',
        amount: this.paymentData.is_trial ? 1 : this.calculateAmount().finalAmount, // Store charge amount: $1 for trials, real price for subscriptions
        currency: this.calculateAmount().currency,
        payment_method: 'midtrans_recurring',
        billing_period: this.paymentData.billing_period,
        trial_metadata: trialMetadata,
        metadata: {
          token_id: this.tokenId,
          customer_info: this.paymentData.customer_info,
          payment_gateway_type: 'midtrans_recurring',
          package_details: {
            id: this.paymentData.package_id,
            name: this.packageData?.name || 'Package',
            price: this.calculateAmount().finalAmount
          },
          billing_period: this.paymentData.billing_period,
          is_trial: this.paymentData.is_trial || false
        }
      })
      .select('id')
      .single()

    if (dbError || !transaction) {
      throw new Error('Failed to create transaction record')
    }

    const transactionId = transaction.id

    // Initialize Midtrans service
    this.midtransService = PaymentServiceFactory.createMidtransService('recurring', {
      server_key: this.gateway.api_credentials.server_key,
      client_key: this.gateway.api_credentials.client_key,
      environment: this.gateway.configuration.environment,
      merchant_id: this.gateway.api_credentials.merchant_id
    })

    // Step 1: Create charge transaction with token_id from frontend tokenization
    console.log('🚀 [Midtrans Recurring] Creating charge transaction with parameters:', {
      order_id: transactionId,
      amount_usd: amount.finalAmount,
      token_id: this.tokenId.substring(0, 20) + '...',
      customer_name: `${this.paymentData.customer_info.first_name} ${this.paymentData.customer_info.last_name}`,
      customer_email: this.paymentData.customer_info.email
    })

    // Midtrans requires minimum charge of $0.01, so use $1 for trials to meet requirement
    const chargeAmount = this.paymentData.is_trial ? 1 : amount.finalAmount;
    
    const chargeTransaction = await this.midtransService.createChargeTransaction({
      order_id: transactionId,
      amount_usd: chargeAmount, // Use $1 for trials to meet Midtrans minimum, real price for subscriptions
      token_id: this.tokenId,  // Use token from frontend Midtrans.min.js tokenization
      customer_details: {
        first_name: this.paymentData.customer_info.first_name,
        last_name: this.paymentData.customer_info.last_name,
        email: this.paymentData.customer_info.email,
        phone: this.paymentData.customer_info.phone,
      },
      item_details: {
        name: this.paymentData.is_trial ? `${this.packageData.name} - 3 Day Free Trial` : this.packageData.name,
        description: this.paymentData.is_trial ? `Free trial for ${this.packageData.name} plan` : this.packageData.description,
      },
    })

    console.log('📋 [Midtrans Recurring] COMPLETE CHARGE RESPONSE FROM MIDTRANS:', JSON.stringify(chargeTransaction, null, 2))

    // Check if 3DS authentication is required
    if (chargeTransaction.redirect_url || chargeTransaction.transaction_status === 'pending') {
      console.log('🔐 3DS Authentication required for transaction:', {
        order_id: transactionId,
        transaction_id: chargeTransaction.transaction_id,
        redirect_url: chargeTransaction.redirect_url,
        transaction_status: chargeTransaction.transaction_status
      })

      // Update transaction status to pending_3ds - preserve original metadata including token_id
      const { data: currentTransaction } = await supabaseAdmin
        .from('indb_payment_transactions')
        .select('metadata')
        .eq('id', transactionId)
        .single()

      await supabaseAdmin
        .from('indb_payment_transactions')
        .update({
          transaction_status: 'pending_3ds',
          gateway_transaction_id: chargeTransaction.transaction_id,
          gateway_response: chargeTransaction,
          metadata: {
            ...currentTransaction?.metadata,
            token_id: this.tokenId,
            customer_info: this.paymentData.customer_info,
            package_details: {
              id: this.packageData.id,
              name: this.packageData.name,
              price: this.calculateAmount().finalAmount
            },
            billing_period: this.paymentData.billing_period,
            processing_method: 'recurring',
            requires_3ds: true
          }
        })
        .eq('id', transactionId)

      return {
        success: true,
        requires_redirect: true,
        redirect_url: chargeTransaction.redirect_url,
        data: {
          order_id: transactionId,
          transaction_id: chargeTransaction.transaction_id,
          requires_3ds: true
        }
      }
    }

    // CRITICAL FIX: For recurring payments, 3DS authentication is ALWAYS required
    // Subscription creation will ONLY be handled by the 3DS callback endpoint
    // This code path should never execute for recurring payments since they always require 3DS
    console.log('⚠️ [CRITICAL] Unexpected immediate charge completion without 3DS for recurring payment:', {
      transaction_status: chargeTransaction.transaction_status,
      order_id: transactionId,
      transaction_id: chargeTransaction.transaction_id
    })
    
    // Mark transaction as failed since this shouldn't happen for recurring payments
    await supabaseAdmin
      .from('indb_payment_transactions')
      .update({
        transaction_status: 'failed',
        gateway_response: chargeTransaction,
        metadata: {
          ...this.getTransactionMetadata(),
          error_reason: 'unexpected_immediate_completion_without_3ds',
          processing_method: 'recurring'
        }
      })
      .eq('id', transactionId)
    
    throw new Error('Recurring payments must use 3DS authentication. Immediate completion is not supported.')
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

  private async updateUserTrialSubscription(subscription: any, amount: number): Promise<void> {
    const now = new Date()
    const trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now

    await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        package_id: this.paymentData.package_id,
        subscribed_at: now.toISOString(),
        expires_at: trialEndDate.toISOString(), // Trial expires in 3 days
        trial_started_at: now.toISOString(),
        trial_status: 'active',
        auto_billing_enabled: true,
        has_used_trial: true, // Mark trial as used
        trial_used_at: now.toISOString()
      })
      .eq('user_id', this.paymentData.user.id)
    
    console.log('✅ [Trial] User profile updated with trial information')
  }
}