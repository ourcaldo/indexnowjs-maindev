import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

const midtransClient = require('midtrans-client')

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 [Snap Webhook] Received notification')
    
    const body = await request.json()
    
    console.log('📊 [Snap Webhook] Notification data:', {
      order_id: body.order_id,
      transaction_status: body.transaction_status,
      fraud_status: body.fraud_status,
      payment_type: body.payment_type
    })

    // Get Midtrans Snap configuration for signature verification
    const { data: snapGateway, error: gatewayError } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'midtrans_snap')
      .eq('is_active', true)
      .single()

    if (gatewayError || !snapGateway) {
      console.log('❌ [Snap Webhook] Gateway configuration not found')
      return NextResponse.json({ status: 'error', message: 'Gateway not configured' }, { status: 500 })
    }

    const { server_key } = snapGateway.api_credentials
    const { environment } = snapGateway.configuration

    // Initialize Midtrans client for notification verification
    const snap = new midtransClient.Snap({
      isProduction: environment === 'production',
      serverKey: server_key
    })

    // Verify notification authenticity
    const notificationJson = snap.transaction.notification(body)
    const statusResponse = await notificationJson

    console.log('✅ [Snap Webhook] Notification verified:', {
      order_id: statusResponse.order_id,
      transaction_status: statusResponse.transaction_status,
      fraud_status: statusResponse.fraud_status
    })

    // Update transaction status in database
    const orderId = statusResponse.order_id
    const transactionStatus = statusResponse.transaction_status
    const fraudStatus = statusResponse.fraud_status

    let finalStatus = 'pending'

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        finalStatus = 'completed'
      } else if (fraudStatus === 'challenge') {
        finalStatus = 'pending'
      }
    } else if (transactionStatus === 'settlement') {
      finalStatus = 'completed'
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      finalStatus = 'failed'
    } else if (transactionStatus === 'pending') {
      finalStatus = 'pending'
    }

    console.log(`📈 [Snap Webhook] Status mapping: ${transactionStatus} -> ${finalStatus}`)

    // Update transaction in database
    const { data: transaction, error: updateError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .update({
        transaction_status: finalStatus,
        gateway_response: {
          ...statusResponse,
          updated_at: new Date().toISOString()
        },
        processed_at: finalStatus === 'completed' ? new Date().toISOString() : null
      })
      .eq('payment_reference', orderId)
      .select('*')
      .single()

    if (updateError) {
      console.log('❌ [Snap Webhook] Failed to update transaction:', updateError.message)
      return NextResponse.json({ status: 'error', message: 'Database update failed' }, { status: 500 })
    }

    console.log('✅ [Snap Webhook] Transaction updated successfully')

    // If payment is completed, activate subscription
    if (finalStatus === 'completed' && transaction) {
      console.log('🔄 [Snap Webhook] Processing subscription activation')
      
      try {
        // Calculate subscription dates
        const subscribedAt = new Date()
        const expiresAt = new Date()
        
        if (transaction.billing_period === 'monthly') {
          expiresAt.setMonth(expiresAt.getMonth() + 1)
        } else if (transaction.billing_period === 'annual') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        }

        // Update user profile with subscription
        const { error: profileError } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .update({
            package_id: transaction.package_id,
            subscribed_at: subscribedAt.toISOString(),
            expires_at: expiresAt.toISOString()
          })
          .eq('user_id', transaction.user_id)

        if (profileError) {
          console.log('⚠️ [Snap Webhook] Failed to update user profile:', profileError.message)
        } else {
          console.log('✅ [Snap Webhook] User subscription activated')
        }

        // Create subscription record
        const { error: subscriptionError } = await supabaseAdmin
          .from('indb_payment_subscriptions')
          .insert({
            id: `snap-sub-${orderId}`,
            user_id: transaction.user_id,
            package_id: transaction.package_id,
            billing_period: transaction.billing_period,
            amount: transaction.amount,
            currency: transaction.currency,
            payment_method: 'midtrans_snap',
            subscription_status: 'active',
            started_at: subscribedAt.toISOString(),
            next_billing_date: expiresAt.toISOString(),
            gateway_subscription_id: orderId
          })

        if (subscriptionError) {
          console.log('⚠️ [Snap Webhook] Failed to create subscription record:', subscriptionError.message)
        } else {
          console.log('✅ [Snap Webhook] Subscription record created')
        }

      } catch (subscriptionError) {
        console.log('💥 [Snap Webhook] Subscription activation error:', subscriptionError)
      }
    }

    console.log('🎉 [Snap Webhook] Webhook processing completed successfully')

    return NextResponse.json({ status: 'ok' })

  } catch (error: any) {
    console.error('💥 [Snap Webhook] Error:', error)
    console.error('🔍 [Snap Webhook] Error details:', {
      message: error.message,
      stack: error.stack
    })

    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 })
  }
}