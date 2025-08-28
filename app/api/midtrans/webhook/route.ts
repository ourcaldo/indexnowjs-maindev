import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { AutoCancelJob } from '@/lib/payment-services/auto-cancel-job'
import { emailService } from '@/lib/email/emailService'
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
          // For subscription renewals, check if this is a recurring payment without existing transaction
          if (isSubscriptionEvent || body.subscription_id) {
            console.log('🔄 [Unified Webhook] No transaction found, checking if this is a subscription renewal')
            return await handleSubscriptionRenewal(body, orderId, supabaseAdmin)
          }
          
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
      case 'failure':
        newStatus = 'failed'
        // Send order expired email for failed payments
        await sendOrderExpiredEmail(body, transaction, supabaseAdmin, paymentType, body.transaction_status)
        break
      case 'expire':
        // Handle expire status with auto-cancel service
        console.log(`⏰ [${paymentType.toUpperCase()}] Transaction expired, processing with auto-cancel service`)
        newStatus = 'expired'
        await AutoCancelJob.handleMidtransExpireNotification(transaction, body)
        // Send order expired email
        await sendOrderExpiredEmail(body, transaction, supabaseAdmin, paymentType, 'expired')
        return NextResponse.json({ status: 'OK', message: 'Transaction expired and processed' })
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

    // Send order confirmation email with payment details for pending transactions
    // This handles bank_transfer and cstore payments that need payment instructions
    if (newStatus === 'pending' && (body.payment_type === 'bank_transfer' || body.payment_type === 'cstore')) {
      console.log(`📧 [${paymentType.toUpperCase()}] Sending order confirmation with payment details for ${body.payment_type}`)
      await sendOrderConfirmationWithDetails(body, transaction, supabaseAdmin, paymentType)
    }

    // If payment is completed, send payment received email and activate subscription
    if (newStatus === 'completed') {
      // Send payment received email
      try {
        const { data: userData } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('full_name, email')
          .eq('user_id', transaction.user_id)
          .single()

        const { data: packageData } = await supabaseAdmin
          .from('indb_payment_packages')
          .select('name')
          .eq('id', transaction.package_id)
          .single()

        if (userData && packageData) {
          // Get original currency from transaction metadata or use transaction currency
          const originalCurrency = transaction.currency || (transaction.metadata as any)?.original_currency || 'USD'
          const displayAmount = originalCurrency === 'USD' 
            ? `$${Number(transaction.amount).toFixed(2)}`
            : `${originalCurrency} ${Number(transaction.amount).toLocaleString('id-ID')}`

          await emailService.sendPaymentReceived(userData.email, {
            customerName: userData.full_name || 'Customer',
            orderId: transaction.payment_reference || transaction.id,
            packageName: packageData.name,
            billingPeriod: transaction.billing_period || 'monthly',
            amount: displayAmount,
            paymentDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          })
        }
      } catch (emailError) {
        console.error(`⚠️ [${paymentType.toUpperCase()}] Failed to send payment received email:`, emailError)
      }

      await activateSubscription(body, transaction, supabaseAdmin, paymentType)
    }

    return NextResponse.json({ status: 'OK' })

  } catch (error: any) {
    console.error(`💥 [${paymentType.toUpperCase()}] Processing error:`, error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

async function sendOrderConfirmationWithDetails(body: any, transaction: any, supabaseAdmin: any, paymentType: string) {
  try {
    const { data: userData } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('full_name, email')
      .eq('user_id', transaction.user_id)
      .single()

    const { data: packageData } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('name')
      .eq('id', transaction.package_id)
      .single()

    if (userData && packageData) {
      // Get original currency and converted amount for proper display
      const originalCurrency = transaction.currency || (transaction.metadata as any)?.original_currency || 'USD'
      const convertedAmount = (transaction.metadata as any)?.converted_amount
      const convertedCurrency = (transaction.metadata as any)?.converted_currency || 'IDR'
      
      // Use converted amount if available (for Midtrans which uses IDR), otherwise use original
      const displayAmount = convertedAmount 
        ? `${convertedCurrency} ${Number(convertedAmount).toLocaleString('id-ID')}`
        : originalCurrency === 'USD' 
          ? `$${Number(transaction.amount).toFixed(2)}`
          : `${originalCurrency} ${Number(transaction.amount).toLocaleString('id-ID')}`

      const emailData: any = {
        customerName: userData.full_name || 'Customer',
        orderId: transaction.payment_reference || transaction.id,
        packageName: packageData.name,
        billingPeriod: transaction.billing_period || 'monthly',
        amount: displayAmount,
        paymentMethod: 'Midtrans',
        orderDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }

      // Add payment details based on payment type
      if (body.payment_type === 'bank_transfer' && body.va_numbers && body.va_numbers.length > 0) {
        const vaInfo = body.va_numbers[0]
        emailData.vaNumber = vaInfo.va_number
        emailData.vaBank = vaInfo.bank.toUpperCase()
        emailData.paymentMethod = `Midtrans Virtual Account (${vaInfo.bank.toUpperCase()})`
      } else if (body.payment_type === 'cstore' && body.payment_code) {
        emailData.storeCode = body.payment_code
        emailData.storeName = body.store ? body.store.charAt(0).toUpperCase() + body.store.slice(1) : 'Convenience Store'
        emailData.paymentMethod = `Midtrans ${emailData.storeName}`
      }

      // Add expiry time if available
      if (body.expiry_time) {
        emailData.expiryTime = new Date(body.expiry_time).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }

      await emailService.sendBillingConfirmation(userData.email, emailData)
      console.log(`✅ [${paymentType.toUpperCase()}] Order confirmation email sent with payment details`)
    }
  } catch (emailError) {
    console.error(`⚠️ [${paymentType.toUpperCase()}] Failed to send order confirmation email:`, emailError)
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
      
      // Send package activated email
      try {
        const { data: userData } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('full_name, email')
          .eq('user_id', transaction.user_id)
          .single()

        if (userData) {
          await emailService.sendPackageActivated(userData.email, {
            customerName: userData.full_name || 'Customer',
            packageName: packageData.name,
            billingPeriod: billingPeriod,
            expiresAt: expiresAt.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            activationDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            dashboardUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://indexnow.studio'
          })
        }
      } catch (emailError) {
        console.error(`⚠️ [${paymentType.toUpperCase()}] Failed to send package activated email:`, emailError)
      }
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
        // Use relative URL for server-side API calls
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'
        const activityResponse = await fetch(`${baseUrl}/api/activity/log`, {
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
        } else {
          console.error('⚠️ [Subscription] Activity logging failed with status:', activityResponse.status)
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

async function sendOrderExpiredEmail(body: any, transaction: any, supabaseAdmin: any, paymentType: string, status: string) {
  try {
    console.log(`📧 [${paymentType.toUpperCase()}] Sending order expired email for status: ${status}`)
    
    const { data: userData } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('full_name, email')
      .eq('user_id', transaction.user_id)
      .single()

    const { data: packageData } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('name')
      .eq('id', transaction.package_id)
      .single()

    if (userData && packageData) {
      // Get original currency and amount for proper display
      const originalCurrency = transaction.currency || (transaction.metadata as any)?.original_currency || 'USD'
      const displayAmount = originalCurrency === 'USD' 
        ? `$${Number(transaction.amount).toFixed(2)}`
        : `${originalCurrency} ${Number(transaction.amount).toLocaleString('id-ID')}`

      await emailService.sendOrderExpired(userData.email, {
        customerName: userData.full_name || 'Customer',
        orderId: transaction.payment_reference || transaction.id,
        packageName: packageData.name,
        billingPeriod: transaction.billing_period || 'monthly',
        amount: displayAmount,
        status: status === 'expired' ? 'Expired' : 'Failed',
        expiredDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        subscribeUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://indexnow.studio'
      })
      console.log(`✅ [${paymentType.toUpperCase()}] Order expired email sent successfully`)
    }
  } catch (emailError) {
    console.error(`⚠️ [${paymentType.toUpperCase()}] Failed to send order expired email:`, emailError)
  }
}

/**
 * Handle subscription renewals that don't have matching transaction records
 * This occurs when Midtrans processes automatic recurring payments
 */
async function handleSubscriptionRenewal(body: any, orderId: string, supabaseAdmin: any) {
  try {
    console.log('🔄 [Subscription Renewal] Processing automatic renewal for order_id:', orderId)
    console.log('🔍 [Subscription Renewal] Webhook body keys:', Object.keys(body))
    
    // Look for user based on subscription metadata or webhook body
    let userId = body.metadata?.user_id
    let userEmail = body.metadata?.user_email || body.metadata?.email
    let packageId = body.metadata?.package_id
    let billingPeriod = body.metadata?.billing_period || 'monthly'
    let originalOrderId = body.metadata?.order_id
    
    // Also check customer_details from webhook body
    if (!userEmail && body.customer_details?.email) {
      userEmail = body.customer_details.email
    }
    
    console.log('🔍 [Subscription Renewal] Extracted metadata:', {
      userId, userEmail, packageId, billingPeriod, originalOrderId
    })
    console.log('🔍 [Subscription Renewal] Available metadata keys:', Object.keys(body.metadata || {}))
    console.log('🔍 [Subscription Renewal] Customer details:', body.customer_details)
    
    // If no user metadata found, try to find by subscription ID
    if (!userId && body.subscription_id) {
      console.log('🔍 [Subscription Renewal] Searching by subscription_id:', body.subscription_id)
      
      const { data: existingSubscription } = await supabaseAdmin
        .from('indb_payment_midtrans')
        .select('user_id, package_id, billing_period, customer_details')
        .eq('subscription_id', body.subscription_id)
        .single()
        
      if (existingSubscription) {
        userId = existingSubscription.user_id
        packageId = existingSubscription.package_id
        billingPeriod = existingSubscription.billing_period
        userEmail = existingSubscription.customer_details?.email
        console.log('✅ [Subscription Renewal] Found existing subscription data:', { userId, packageId })
      }
    }
    
    // If still no userId, try to find user by email
    if (!userId && userEmail) {
      console.log('🔍 [Subscription Renewal] Searching user by email:', userEmail)
      
      const { data: userByEmail } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('user_id, package_id')
        .eq('email', userEmail)
        .single()
        
      if (userByEmail) {
        userId = userByEmail.user_id
        if (!packageId) packageId = userByEmail.package_id
        console.log('✅ [Subscription Renewal] Found user by email:', userId)
      }
    }
    
    if (!userId) {
      console.error('❌ [Subscription Renewal] Cannot process: no user identification found')
      console.error('❌ [Subscription Renewal] Available data:', { 
        metadata: body.metadata, 
        customer_details: body.customer_details,
        subscription_id: body.subscription_id 
      })
      return NextResponse.json({ error: 'User identification required for renewal' }, { status: 400 })
    }
    
    // Get package data
    const { data: packageData } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('id', packageId)
      .single()
      
    if (!packageData) {
      console.error('❌ [Subscription Renewal] Package not found:', packageId)
      return NextResponse.json({ error: 'Package not found' }, { status: 400 })
    }
    
    // Use unified order ID template (same as regular orders)
    const renewalOrderId = `ORDER-${Date.now()}-${userId.substring(0, 8)}`
    
    console.log('🆔 [Subscription Renewal] Generated unified order_id:', renewalOrderId)
    
    // Create transaction record for the renewal
    const renewalTransaction = {
      user_id: userId,
      package_id: packageId,
      amount: parseFloat(body.gross_amount || '0'),
      currency: body.currency || 'IDR',
      billing_period: billingPeriod,
      payment_method: 'midtrans_recurring',
      transaction_status: 'completed',
      payment_reference: renewalOrderId, // Use new renewal order ID
      gateway_transaction_id: body.transaction_id,
      created_at: new Date().toISOString(),
      metadata: {
        renewal_type: 'automatic_recurring',
        original_order_id: originalOrderId,
        midtrans_webhook_order_id: orderId, // The order_id from Midtrans webhook
        midtrans_webhook_data: body,
        subscription_id: body.subscription_id
      }
    }
    
    const { data: newTransaction } = await supabaseAdmin
      .from('indb_payment_transactions')
      .insert(renewalTransaction)
      .select()
      .single()
      
    console.log('✅ [Subscription Renewal] Created transaction record:', newTransaction.id)
    
    // Update user subscription expiration
    const currentDate = new Date()
    const nextBillingDate = billingPeriod === 'yearly' ? 
      new Date(currentDate.getTime() + 365 * 24 * 60 * 60 * 1000) :
      new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        package_id: packageId,
        subscribed_at: currentDate.toISOString(),
        expires_at: nextBillingDate.toISOString(),
        updated_at: currentDate.toISOString()
      })
      .eq('user_id', userId)
      
    console.log('✅ [Subscription Renewal] Updated user package expiration to:', nextBillingDate.toISOString())
    
    // Create Midtrans payment record
    await supabaseAdmin
      .from('indb_payment_midtrans')
      .insert({
        transaction_id: newTransaction.id,
        user_id: userId,
        package_id: packageId,
        gateway_transaction_id: body.transaction_id,
        subscription_id: body.subscription_id,
        amount: parseFloat(body.gross_amount || '0'),
        currency: body.currency || 'IDR',
        payment_status: 'completed',
        subscription_status: 'active',
        billing_period: billingPeriod,
        card_type: body.card_type,
        masked_card: body.masked_card,
        bank: body.bank,
        metadata: {
          renewal_payment: true,
          webhook_data: body
        }
      })
    
    // Send renewal confirmation email if user email available
    if (userEmail) {
      try {
        const { data: userProfile } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('full_name')
          .eq('user_id', userId)
          .single()
          
        await emailService.sendBillingConfirmation(userEmail, {
          customerName: userProfile?.full_name || 'Customer',
          orderId: renewalOrderId,
          packageName: packageData.name,
          billingPeriod: billingPeriod,
          amount: body.currency === 'USD' ? `$${parseFloat(body.gross_amount).toFixed(2)}` : `IDR ${Number(body.gross_amount).toLocaleString('id-ID')}`,
          paymentMethod: 'Midtrans (Auto-renewal)',
          paymentDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        })
        
        console.log('✅ [Subscription Renewal] Sent renewal confirmation email to:', userEmail)
      } catch (emailError) {
        console.error('⚠️ [Subscription Renewal] Failed to send email:', emailError)
      }
    }
    
    console.log('🎉 [Subscription Renewal] Successfully processed automatic renewal')
    return NextResponse.json({ 
      status: 'Renewal processed successfully',
      renewal_order_id: renewalOrderId,
      original_webhook_order_id: orderId,
      user_id: userId,
      package_name: packageData.name
    })
    
  } catch (error: any) {
    console.error('💥 [Subscription Renewal] Processing error:', error)
    return NextResponse.json({ error: 'Renewal processing failed' }, { status: 500 })
  }
}