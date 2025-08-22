import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

const midtransClient = require('midtrans-client')

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 [Unified Webhook] Received Midtrans notification')
    
    // Check content type to determine parsing method
    const contentType = request.headers.get('content-type') || ''
    console.log('📋 [Unified Webhook] Content-Type:', contentType)
    
    let body: any = {}
    
    if (contentType.includes('application/json')) {
      // Parse JSON data
      body = await request.json()
      console.log('📦 [Unified Webhook] Parsed as JSON')
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form-encoded data
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries())
      console.log('📝 [Unified Webhook] Parsed as form data')
    } else {
      // Try to parse as text and then JSON
      const text = await request.text()
      console.log('📄 [Unified Webhook] Raw text data:', text.substring(0, 200))
      
      try {
        body = JSON.parse(text)
        console.log('🔄 [Unified Webhook] Parsed text as JSON')
      } catch (e) {
        // If it's not JSON, try to parse as query parameters
        const params = new URLSearchParams(text)
        body = Object.fromEntries(params.entries())
        console.log('🔗 [Unified Webhook] Parsed as URL parameters')
      }
    }
    
    // Detect notification type and extract order_id accordingly
    let orderId: string
    let notificationType: string
    let isSubscriptionEvent = false

    if (body.subscription && body.event_name) {
      // Subscription notification
      isSubscriptionEvent = true
      notificationType = body.event_name
      orderId = body.subscription.metadata?.order_id
      console.log('🔄 [Unified Webhook] Subscription notification detected:', {
        event_name: body.event_name,
        subscription_id: body.subscription.id,
        extracted_order_id: orderId,
        subscription_status: body.subscription.status
      })
    } else {
      // Payment/transaction notification
      notificationType = body.transaction_status || 'unknown'
      orderId = body.order_id
      console.log('📊 [Unified Webhook] Payment notification detected:', {
        order_id: orderId,
        transaction_status: body.transaction_status,
        fraud_status: body.fraud_status,
        payment_type: body.payment_type
      })
    }

    console.log('🔍 [Unified Webhook] Processed notification:', {
      type: isSubscriptionEvent ? 'subscription' : 'payment',
      event: notificationType,
      order_id: orderId,
      raw_body_keys: Object.keys(body)
    })

    if (!orderId) {
      console.error('❌ [Unified Webhook] No order_id found in notification')
      return NextResponse.json({ error: 'Order ID not found' }, { status: 400 })
    }

    // Find transaction to determine payment method
    let transaction = null
    
    // First try payment_reference
    const { data: refTransaction } = await supabaseAdmin
      .from('indb_payment_transactions')
      .select('*')
      .eq('payment_reference', orderId)
      .single()
      
    if (refTransaction) {
      transaction = refTransaction
    } else {
      // Try searching in metadata as backup
      const { data: metadataTransaction } = await supabaseAdmin
        .from('indb_payment_transactions')
        .select('*')
        .contains('metadata', { midtrans_order_id: orderId })
        .single()
        
      if (metadataTransaction) {
        transaction = metadataTransaction
      } else {
        // Try gateway_transaction_id as last resort
        const { data: gatewayTransaction } = await supabaseAdmin
          .from('indb_payment_transactions')
          .select('*')
          .ilike('gateway_transaction_id', `%${orderId}%`)
          .single()
          
        if (gatewayTransaction) {
          transaction = gatewayTransaction
        } else {
          console.error('❌ [Unified Webhook] Transaction not found for order_id:', orderId)
          return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }
      }
    }

    console.log('✅ [Unified Webhook] Found transaction:', transaction.id, 'Payment method:', transaction.payment_method)

    // Handle subscription events separately
    if (isSubscriptionEvent) {
      console.log('🔄 [Unified Webhook] Processing subscription event')
      return await handleSubscriptionEvent(body, transaction, supabaseAdmin, notificationType)
    }

    // Determine if this is Recurring or Snap payment
    const isRecurringPayment = transaction.payment_method === 'midtrans' || 
                               transaction.payment_method === 'credit_card' ||
                               (transaction.metadata as any)?.payment_gateway_type === 'midtrans'
    const isSnapPayment = transaction.payment_method === 'midtrans_snap' || 
                          (transaction.metadata as any)?.payment_gateway_type === 'midtrans_snap'

    console.log('🔍 [Unified Webhook] Payment type detection:', {
      isRecurringPayment,
      isSnapPayment,
      gateway_type: transaction.gateway_type
    })

    // Handle verification based on payment type
    if (isRecurringPayment) {
      console.log('🔄 [Unified Webhook] Processing as Recurring payment')
      return await handleRecurringPayment(body, transaction, supabaseAdmin)
    } else if (isSnapPayment) {
      console.log('📱 [Unified Webhook] Processing as Snap payment')
      return await handleSnapPayment(body, transaction, supabaseAdmin)
    } else {
      // Default to Snap if unclear
      console.log('❓ [Unified Webhook] Payment type unclear, defaulting to Snap processing')
      return await handleSnapPayment(body, transaction, supabaseAdmin)
    }

  } catch (error: any) {
    console.error('💥 [Unified Webhook] Error:', error)
    console.error('💥 [Unified Webhook] Error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 500)
    })
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 })
  }
}

// Also handle GET requests for verification
export async function GET(request: NextRequest) {
  console.log('👀 [Unified Webhook] Received GET request (likely verification)')
  const url = new URL(request.url)
  const params = Object.fromEntries(url.searchParams.entries())
  
  console.log('📊 [Unified Webhook] GET parameters:', {
    order_id: params.order_id,
    transaction_status: params.transaction_status,
    fraud_status: params.fraud_status,
    payment_type: params.payment_type,
    all_params: params
  })
  
  return NextResponse.json({ status: 'ok', message: 'Webhook endpoint active' })
}

async function handleRecurringPayment(body: any, transaction: any, supabaseAdmin: any) {
  try {
    console.log('🔐 [Recurring] Verifying signature...')
    
    // Get Midtrans recurring gateway configuration
    const { data: gatewayData, error: gatewayError } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'midtrans')
      .eq('is_active', true)
      .single()

    if (gatewayError || !gatewayData) {
      console.error('❌ [Recurring] Gateway not found')
      return NextResponse.json({ error: 'Gateway not configured' }, { status: 404 })
    }

    // Verify Midtrans signature
    const serverKey = gatewayData.api_credentials.server_key
    const { order_id, status_code, gross_amount, signature_key } = body
    
    const signatureString = order_id + status_code + gross_amount + serverKey
    const computedSignature = crypto.createHash('sha512').update(signatureString).digest('hex')
    
    if (signature_key !== computedSignature) {
      console.error('❌ [Recurring] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('✅ [Recurring] Signature verified')
    return await processTransaction(body, transaction, supabaseAdmin, 'recurring')

  } catch (error: any) {
    console.error('💥 [Recurring] Error:', error)
    return NextResponse.json({ error: 'Recurring processing failed' }, { status: 500 })
  }
}

async function handleSnapPayment(body: any, transaction: any, supabaseAdmin: any) {
  try {
    console.log('🔐 [Snap] Verifying notification...')
    
    // Get Midtrans Snap configuration
    const { data: snapGateway, error: gatewayError } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'midtrans_snap')
      .eq('is_active', true)
      .single()

    if (gatewayError || !snapGateway) {
      console.log('❌ [Snap] Gateway configuration not found')
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

    console.log('✅ [Snap] Notification verified')
    return await processTransaction(statusResponse, transaction, supabaseAdmin, 'snap')

  } catch (error: any) {
    console.error('💥 [Snap] Error:', error)
    return NextResponse.json({ error: 'Snap processing failed' }, { status: 500 })
  }
}

async function processTransaction(body: any, transaction: any, supabaseAdmin: any, paymentType: string) {
  try {
    console.log(`🚀 [${paymentType.toUpperCase()}] Processing transaction:`, transaction.id)
    console.log('📊 Status:', body.transaction_status, 'Fraud:', body.fraud_status)
    
    // Update transaction status based on Midtrans status
    let newStatus = 'pending'
    let processedAt = null

    switch (body.transaction_status) {
      case 'capture':
        if (body.fraud_status === 'accept') {
          newStatus = 'completed'
          processedAt = new Date().toISOString()
        } else if (body.fraud_status === 'challenge') {
          newStatus = 'review'
        } else {
          newStatus = 'failed'
        }
        break
      case 'settlement':
        newStatus = 'completed'
        processedAt = new Date().toISOString()
        break
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'failure':
        newStatus = 'failed'
        break
      case 'pending':
        newStatus = 'pending'
        break
    }

    console.log(`🔄 [${paymentType.toUpperCase()}] Updating status: '${transaction.transaction_status}' → '${newStatus}'`)
    
    // Update transaction
    const { error: updateError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .update({
        transaction_status: newStatus,
        processed_at: processedAt,
        verified_at: newStatus === 'completed' ? new Date().toISOString() : null,
        gateway_response: {
          ...transaction.gateway_response,
          webhook_data: body,
          updated_at: new Date().toISOString(),
          payment_type: paymentType
        }
      })
      .eq('id', transaction.id)

    if (updateError) {
      console.error(`❌ [${paymentType.toUpperCase()}] Failed to update transaction:`, updateError)
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
    }
    
    console.log(`✅ [${paymentType.toUpperCase()}] Transaction updated successfully`)

    // If payment is completed, activate subscription
    if (newStatus === 'completed') {
      await activateSubscription(body, transaction, supabaseAdmin, paymentType)
    }

    return NextResponse.json({ status: 'OK' })

  } catch (error: any) {
    console.error(`💥 [${paymentType.toUpperCase()}] Processing error:`, error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

async function activateSubscription(body: any, transaction: any, supabaseAdmin: any, paymentType: string) {
  try {
    console.log(`🎉 [${paymentType.toUpperCase()}] Activating subscription for user:`, transaction.user_id)
    
    // Get package details
    const { data: packageData, error: packageError } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('id', transaction.package_id)
      .single()

    if (packageError || !packageData) {
      console.error(`❌ [${paymentType.toUpperCase()}] Package not found:`, packageError)
      return
    }

    const billingPeriod = transaction.billing_period || 
                          (transaction.metadata as any)?.billing_period || 
                          'monthly'
    
    console.log(`📅 [${paymentType.toUpperCase()}] Billing period:`, billingPeriod)
    
    const now = new Date()
    let expiresAt = new Date(now)
    let nextBillingDate = new Date(now)

    switch (billingPeriod) {
      case 'weekly':
        expiresAt.setDate(now.getDate() + 7)
        nextBillingDate.setDate(now.getDate() + 7)
        break
      case 'monthly':
        expiresAt.setMonth(now.getMonth() + 1)
        nextBillingDate.setMonth(now.getMonth() + 1)
        break
      case 'quarterly':
        expiresAt.setMonth(now.getMonth() + 3)
        nextBillingDate.setMonth(now.getMonth() + 3)
        break
      case 'annually':
        expiresAt.setFullYear(now.getFullYear() + 1)
        nextBillingDate.setFullYear(now.getFullYear() + 1)
        break
    }

    // Update user profile with new package
    const { error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        package_id: transaction.package_id,
        subscribed_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('user_id', transaction.user_id)

    if (profileError) {
      console.error(`❌ [${paymentType.toUpperCase()}] Failed to update user profile:`, profileError)
    } else {
      console.log(`✅ [${paymentType.toUpperCase()}] Subscription activated successfully`)
      console.log(`📦 Package: ${packageData.name} (${billingPeriod})`)
      console.log(`⏰ Valid until: ${expiresAt.toISOString()}`)
    }

    // Create subscription record based on payment type
    if (paymentType === 'recurring') {
      // Store Midtrans transaction record for recurring
      const midtransTransactionData = {
        transaction_id: body.transaction_id,
        order_id: body.order_id,
        user_id: transaction.user_id,
        package_id: transaction.package_id,
        amount: parseFloat(body.gross_amount),
        currency: body.currency || 'IDR',
        transaction_status: body.transaction_status,
        payment_type: body.payment_type,
        fraud_status: body.fraud_status,
        bank: body.va_numbers?.[0]?.bank || body.bank,
        va_number: body.va_numbers?.[0]?.va_number,
        card_type: body.card_type,
        masked_card: body.masked_card,
        billing_period: billingPeriod,
        settlement_time: body.settlement_time ? new Date(body.settlement_time) : null,
        metadata: {
          webhook_data: body,
          original_metadata: transaction.metadata
        }
      }

      await supabaseAdmin
        .from('indb_payment_midtrans_transactions')
        .insert(midtransTransactionData)

      // Create recurring subscription record
      const subscriptionId = `SUB-${body.order_id}-${Date.now()}`
      const subscriptionData = {
        subscription_id: subscriptionId,
        user_id: transaction.user_id,
        package_id: transaction.package_id,
        status: 'active',
        billing_period: billingPeriod,
        amount: parseFloat(body.gross_amount),
        currency: body.currency || 'IDR',
        started_at: now,
        next_billing_date: nextBillingDate,
        expires_at: expiresAt,
        card_token: body.saved_token_id,
        customer_details: {
          first_name: (transaction.metadata as any)?.customer_info?.first_name,
          last_name: (transaction.metadata as any)?.customer_info?.last_name,
          email: (transaction.metadata as any)?.customer_info?.email,
          phone: (transaction.metadata as any)?.customer_info?.phone
        },
        metadata: {
          auto_renewal: true,
          subscription_type: 'recurring',
          midtrans_data: body
        }
      }

      await supabaseAdmin
        .from('indb_payment_midtrans_subscriptions')
        .insert(subscriptionData)

      console.log(`✅ [${paymentType.toUpperCase()}] Recurring subscription created:`, subscriptionId)
    } else {
      // Create Snap subscription record
      await supabaseAdmin
        .from('indb_payment_subscriptions')
        .insert({
          id: `snap-sub-${body.order_id}`,
          user_id: transaction.user_id,
          package_id: transaction.package_id,
          billing_period: billingPeriod,
          amount: transaction.amount,
          currency: transaction.currency,
          payment_method: 'midtrans_snap',
          subscription_status: 'active',
          started_at: now.toISOString(),
          next_billing_date: expiresAt.toISOString(),
          gateway_subscription_id: body.order_id
        })

      console.log(`✅ [${paymentType.toUpperCase()}] Snap subscription created`)
    }

  } catch (error: any) {
    console.error(`💥 [${paymentType.toUpperCase()}] Subscription activation error:`, error)
  }
}

async function handleSubscriptionEvent(body: any, transaction: any, supabaseAdmin: any, eventType: string) {
  try {
    console.log(`🔔 [Subscription] Processing event: ${eventType}`)
    console.log(`📋 [Subscription] Subscription ID: ${body.subscription.id}`)
    console.log(`👤 [Subscription] User ID: ${body.subscription.metadata?.user_id}`)
    console.log(`📦 [Subscription] Package ID: ${body.subscription.metadata?.package_id}`)
    console.log(`💰 [Subscription] Amount: ${body.subscription.amount} ${body.subscription.currency}`)
    console.log(`📅 [Subscription] Status: ${body.subscription.status}`)

    // Update or log subscription status based on event type
    const subscriptionData = {
      subscription_id: body.subscription.id,
      event_type: eventType,
      subscription_status: body.subscription.status,
      amount: parseFloat(body.subscription.amount),
      currency: body.subscription.currency,
      user_id: body.subscription.metadata?.user_id,
      package_id: body.subscription.metadata?.package_id,
      next_execution: body.subscription.schedule?.next_execution_at,
      metadata: {
        midtrans_subscription: body.subscription,
        original_transaction_id: transaction.id,
        processed_at: new Date().toISOString()
      }
    }

    // Log subscription event to activity log
    if (body.subscription.metadata?.user_id) {
      try {
        const activityResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/activity/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: body.subscription.metadata.user_id,
            event_type: 'subscription_updated',
            action: `Subscription ${eventType} - ID: ${body.subscription.id}`,
            metadata: {
              subscription_id: body.subscription.id,
              event_type: eventType,
              subscription_status: body.subscription.status,
              amount: body.subscription.amount,
              currency: body.subscription.currency
            }
          })
        })

        if (activityResponse.ok) {
          console.log('✅ [Subscription] Activity logged successfully')
        }
      } catch (activityError) {
        console.error('⚠️ [Subscription] Failed to log activity:', activityError)
      }
    }

    // Handle different subscription events
    switch (eventType) {
      case 'subscription.create':
        console.log('🎉 [Subscription] New subscription created')
        break
      case 'subscription.active':
        console.log('✅ [Subscription] Subscription activated')
        break
      case 'subscription.update':
        console.log('📝 [Subscription] Subscription updated')
        break
      case 'subscription.disable':
        console.log('⏸️ [Subscription] Subscription disabled')
        break
      case 'subscription.enable':
        console.log('▶️ [Subscription] Subscription enabled')
        break
      default:
        console.log(`ℹ️ [Subscription] Event processed: ${eventType}`)
    }

    console.log('✅ [Subscription] Event processed successfully')
    return NextResponse.json({ 
      status: 'OK', 
      message: `Subscription event ${eventType} processed successfully`,
      subscription_id: body.subscription.id
    })

  } catch (error: any) {
    console.error('💥 [Subscription] Event processing error:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Subscription event processing failed',
      error: error.message
    }, { status: 500 })
  }
}