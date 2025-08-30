import { BasePaymentHandler, PaymentData, PaymentResult } from '../shared/base-handler'
import { supabaseAdmin } from '@/lib/database'
import { emailService } from '@/lib/email/emailService'

export default class BankTransferHandler extends BasePaymentHandler {
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

    // Send order confirmation email
    try {
      await emailService.sendBillingConfirmation(this.paymentData.customer_info.email, {
        customerName: `${this.paymentData.customer_info.first_name} ${this.paymentData.customer_info.last_name}`.trim(),
        orderId: orderId,
        packageName: this.packageData.name,
        billingPeriod: this.paymentData.billing_period,
        amount: `${amount.currency} ${amount.finalAmount}`,
        paymentMethod: 'Bank Transfer',
        bankName: this.gateway.configuration.bank_name,
        accountName: this.gateway.configuration.account_name,
        accountNumber: this.gateway.configuration.account_number,
        orderDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      })
      console.log('✅ [Bank Transfer] Order confirmation email sent successfully')
    } catch (emailError) {
      console.error('⚠️ [Bank Transfer] Failed to send order confirmation email:', emailError)
    }

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