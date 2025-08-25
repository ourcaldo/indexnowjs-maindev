import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { createMidtransService } from '@/lib/payment-services/midtrans-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting recurring payment processing...')
    
    // Get all active subscriptions that need renewal (next_billing_date <= today)
    const today = new Date()
    const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
      .from('indb_payment_midtrans')
      .select(`
        *,
        indb_payment_transactions!indb_payment_midtrans_transaction_fkey(
          id,
          package_id,
          indb_payment_packages(*)
        )
      `)
      .eq('subscription_status', 'active')
      .lte('next_billing_date', today.toISOString())
      .not('saved_token_id', 'is', null)

    if (subscriptionsError) {
      console.error('❌ Failed to fetch subscriptions:', subscriptionsError)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('✅ No subscriptions need renewal today')
      return NextResponse.json({ message: 'No renewals needed', processed: 0 })
    }

    console.log(`📋 Found ${subscriptions.length} subscriptions for renewal`)

    // Get Midtrans gateway configuration
    const { data: gatewayData } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'midtrans')
      .eq('is_active', true)
      .single()

    if (!gatewayData) {
      console.error('❌ Midtrans gateway not configured')
      return NextResponse.json({ error: 'Gateway not configured' }, { status: 500 })
    }

    const midtransService = createMidtransService(gatewayData)
    let processedCount = 0
    let failedCount = 0

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        console.log(`🔄 Processing subscription ${subscription.midtrans_subscription_id}`)

        // Generate new order ID for renewal
        const renewalOrderId = `RENEWAL-${Date.now()}-${subscription.id.substring(0, 8)}`

        // Create recurring payment using saved card token
        const chargePayload = {
          payment_type: 'credit_card',
          transaction_details: {
            order_id: renewalOrderId,
            gross_amount: subscription.amount
          },
          credit_card: {
            token_id: subscription.saved_token_id,
            authentication: false // Skip 3DS for recurring
          },
          customer_details: subscription.metadata?.customer_details || {},
          item_details: [{
            id: subscription.indb_payment_transactions?.package_id,
            price: subscription.metadata?.amount || 0,
            quantity: 1,
            name: `${subscription.indb_payment_transactions?.indb_payment_packages?.name} - Renewal`,
            category: 'Subscription Renewal'
          }],
          metadata: {
            subscription_id: subscription.midtrans_subscription_id,
            renewal_type: 'automatic',
            original_user_id: subscription.user_id
          }
        }

        // Make Core API call to charge
        const coreBaseUrl = gatewayData.configuration?.environment === 'production' 
          ? 'https://api.midtrans.com' 
          : 'https://api.sandbox.midtrans.com'

        const chargeResponse = await fetch(`${coreBaseUrl}/v2/charge`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(gatewayData.api_credentials.server_key + ':').toString('base64')}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(chargePayload)
        })

        const chargeResult = await chargeResponse.json()

        if (chargeResponse.ok && chargeResult.transaction_status === 'capture') {
          // Payment successful - extend subscription
          const now = new Date()
          let nextBillingDate = new Date(subscription.next_billing_date)
          let newExpiresAt = new Date(subscription.expires_at)

          switch (subscription.billing_period) {
            case 'weekly':
              nextBillingDate.setDate(nextBillingDate.getDate() + 7)
              newExpiresAt.setDate(newExpiresAt.getDate() + 7)
              break
            case 'monthly':
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
              newExpiresAt.setMonth(newExpiresAt.getMonth() + 1)
              break
            case 'quarterly':
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
              newExpiresAt.setMonth(newExpiresAt.getMonth() + 3)
              break
            case 'annually':
              nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
              newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1)
              break
          }

          // Update subscription with new dates
          await supabaseAdmin
            .from('indb_payment_midtrans')
            .update({
              next_billing_date: nextBillingDate.toISOString(),
              updated_at: now.toISOString()
            })
            .eq('id', subscription.id)

          // Update user profile expiry
          await supabaseAdmin
            .from('indb_auth_user_profiles')
            .update({
              expires_at: newExpiresAt.toISOString(),
              updated_at: now.toISOString()
            })
            .eq('user_id', subscription.user_id)

          // Update existing transaction record
          await supabaseAdmin
            .from('indb_payment_transactions')
            .update({
              transaction_status: 'completed',
              processed_at: now.toISOString(),
              verified_at: now.toISOString(),
              notes: `Automatic renewal - ${renewalOrderId}`,
              gateway_response: chargeResult
            })
            .eq('id', subscription.transaction_id)

          // Create new transaction record for renewal
          await supabaseAdmin
            .from('indb_payment_transactions')
            .insert({
              user_id: subscription.user_id,
              package_id: subscription.indb_payment_transactions?.package_id,
              gateway_id: gatewayData.id,
              transaction_type: 'subscription_renewal',
              transaction_status: 'completed',
              amount: subscription.metadata?.amount || 0,
              currency: 'IDR',
              payment_method: 'credit_card',
              payment_reference: renewalOrderId,
              gateway_transaction_id: chargeResult.transaction_id,
              processed_at: now.toISOString(),
              verified_at: now.toISOString(),
              notes: 'Automatic subscription renewal',
              gateway_response: chargeResult
            })

          console.log(`✅ Subscription ${subscription.midtrans_subscription_id} renewed successfully`)
          console.log(`📅 Next billing: ${nextBillingDate.toISOString()}`)
          processedCount++

        } else {
          // Payment failed - handle failure
          console.error(`❌ Renewal failed for ${subscription.midtrans_subscription_id}:`, chargeResult)
          
          // Update subscription status to payment_failed
          await supabaseAdmin
            .from('indb_payment_midtrans')
            .update({
              subscription_status: 'payment_failed',
              metadata: {
                ...subscription.metadata,
                last_failure: {
                  date: new Date().toISOString(),
                  reason: chargeResult.status_message || 'Payment failed',
                  response: chargeResult
                }
              }
            })
            .eq('id', subscription.id)

          failedCount++
        }

      } catch (error) {
        console.error(`❌ Error processing subscription ${subscription.midtrans_subscription_id}:`, error)
        failedCount++
      }
    }

    console.log(`🎯 Recurring payment processing complete:`)
    console.log(`✅ Successful renewals: ${processedCount}`)
    console.log(`❌ Failed renewals: ${failedCount}`)

    return NextResponse.json({
      message: 'Recurring payments processed',
      processed: processedCount,
      failed: failedCount,
      total: subscriptions.length
    })

  } catch (error: any) {
    console.error('❌ Recurring payment processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}