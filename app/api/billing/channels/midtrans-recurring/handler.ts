import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { supabaseAdmin } from '@/lib/database'
import { createMidtransService } from '@/lib/payment-services/midtrans-service'
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
    
    // Generate order ID
    const orderId = `ORDER-${Date.now()}-${this.paymentData.user.id.slice(0, 8)}`

    // Create transaction record BEFORE payment processing with token_id
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

    const { error: dbError } = await supabaseAdmin
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
        payment_reference: orderId,
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

    if (dbError) {
      throw new Error('Failed to create transaction record')
    }

    // Initialize Midtrans service
    this.midtransService = createMidtransService({
      server_key: this.gateway.api_credentials.server_key,
      client_key: this.gateway.api_credentials.client_key,
      environment: this.gateway.configuration.environment,
      merchant_id: this.gateway.api_credentials.merchant_id
    })

    // Step 1: Create charge transaction with token_id from frontend tokenization
    console.log('🚀 [Midtrans Recurring] Creating charge transaction with parameters:', {
      order_id: orderId,
      amount_usd: amount.finalAmount,
      token_id: this.tokenId.substring(0, 20) + '...',
      customer_name: `${this.paymentData.customer_info.first_name} ${this.paymentData.customer_info.last_name}`,
      customer_email: this.paymentData.customer_info.email
    })

    // Midtrans requires minimum charge of $0.01, so use $1 for trials to meet requirement
    const chargeAmount = this.paymentData.is_trial ? 1 : amount.finalAmount;
    
    const chargeTransaction = await this.midtransService.createChargeTransaction({
      order_id: orderId,
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
        order_id: orderId,
        transaction_id: chargeTransaction.transaction_id,
        redirect_url: chargeTransaction.redirect_url,
        transaction_status: chargeTransaction.transaction_status
      })

      // Update transaction status to pending_3ds - preserve original metadata including token_id
      const { data: currentTransaction } = await supabaseAdmin
        .from('indb_payment_transactions')
        .select('metadata')
        .eq('payment_reference', orderId)
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
        .eq('payment_reference', orderId)

      return {
        success: true,
        requires_redirect: true,
        redirect_url: chargeTransaction.redirect_url,
        data: {
          order_id: orderId,
          transaction_id: chargeTransaction.transaction_id,
          requires_3ds: true
        }
      }
    }

    // CRITICAL FIX: Only create subscription if charge was completed immediately (no 3DS)
    // If 3DS was required, subscription creation will be handled by 3DS callback
    if (chargeTransaction.transaction_status === 'capture' || chargeTransaction.transaction_status === 'settlement') {
      // ALWAYS get the saved_token_id from transaction status, not from charge response
      // The charge response may not include saved_token_id, so we always check transaction status
      console.log('🔍 Getting saved_token_id from transaction status (not charge response)...')
      const transactionStatus = await this.midtransService.getTransactionStatus(chargeTransaction.transaction_id)
      const savedTokenId = transactionStatus.saved_token_id
      
      console.log('🔍 saved_token_id from transaction status:', savedTokenId?.substring(0, 20) + '...')

      if (!savedTokenId) {
        throw new Error('Card token was not saved from transaction - save_token_id may have failed')
      }

      // Create subscription with trial-specific logic
      console.log('💳 Creating subscription with saved token:', savedTokenId)
      
      // CRITICAL FIX: For trials, subscription amount MUST be the real package price, not the $1 charge amount
      const subscriptionAmount = this.paymentData.is_trial ? amount.originalAmount : amount.finalAmount; // Use ORIGINAL amount for trials, final for regular
      const subscriptionName = this.paymentData.is_trial ? 
        `${this.packageData.name.toUpperCase()}_TRIAL_AUTO_BILLING` : 
        `${this.packageData.name}_${this.paymentData.billing_period}`.toUpperCase();
      
      console.log('💰 [SUBSCRIPTION AMOUNT DEBUG]:', {
        is_trial: this.paymentData.is_trial,
        charge_amount: this.paymentData.is_trial ? 1 : amount.finalAmount,
        subscription_amount: subscriptionAmount,
        original_amount: amount.originalAmount,
        final_amount: amount.finalAmount
      });
      
      // For trials, start billing 3 days later. For regular subscriptions, use normal interval
      const startTime = this.paymentData.is_trial ? 
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : // 3 days for trial
        new Date(Date.now() + (this.paymentData.billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000);
      
      const subscription = await this.midtransService.createSubscription(subscriptionAmount, {
        name: subscriptionName,
        token: savedTokenId,
        schedule: {
          interval: 1,
          interval_unit: this.paymentData.billing_period === 'monthly' ? 'month' : 'month',
          max_interval: this.paymentData.billing_period === 'monthly' ? 12 : 1,
          start_time: startTime,
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
          trial_type: this.paymentData.is_trial ? 'free_trial_auto_billing' : null,
          original_trial_start: this.paymentData.is_trial ? new Date().toISOString() : null
        },
      })
      console.log('✅ Subscription created successfully:', subscription.id)

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
            saved_token_id: savedTokenId, // This is now the correct permanent saved_token_id from transaction status
            masked_card: transactionStatus.masked_card || chargeTransaction.masked_card
          }
        })
        .eq('payment_reference', orderId)

      // Update user subscription with trial-specific logic
      if (this.paymentData.is_trial) {
        await this.updateUserTrialSubscription(subscription, amount.finalAmount)
      } else {
        await this.updateUserSubscription(subscription, amount.finalAmount)
      }

      // Send order confirmation email
      try {
        await emailService.sendBillingConfirmation(this.paymentData.customer_info.email, {
          customerName: `${this.paymentData.customer_info.first_name} ${this.paymentData.customer_info.last_name}`.trim(),
          orderId: orderId,
          packageName: this.packageData.name,
          billingPeriod: this.paymentData.billing_period,
          amount: `IDR ${amount.finalAmount.toLocaleString('id-ID')}`,
          paymentMethod: 'Midtrans Recurring (Credit Card)',
          orderDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        })
        console.log('✅ [Midtrans Recurring] Order confirmation email sent successfully')
      } catch (emailError) {
        console.error('⚠️ [Midtrans Recurring] Failed to send order confirmation email:', emailError)
      }

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

    // CRITICAL FIX: If we get here and status is not capture/settlement, it means the charge failed
    // Don't create subscription for failed charges
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
        trial_ends_at: trialEndDate.toISOString(),
        trial_status: 'active',
        auto_billing_enabled: true,
        has_used_trial: true, // Mark trial as used
        trial_used_at: now.toISOString()
      })
      .eq('user_id', this.paymentData.user.id)
    
    console.log('✅ [Trial] User profile updated with trial information')
  }
}