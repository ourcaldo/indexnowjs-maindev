import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createMidtransService } from '@/lib/midtrans-service'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Get Midtrans gateway configuration
    const { data: gatewayData, error: gatewayError } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'midtrans')
      .eq('is_active', true)
      .single()

    if (gatewayError || !gatewayData) {
      console.error('Midtrans gateway not found')
      return NextResponse.json({ error: 'Gateway not configured' }, { status: 404 })
    }

    // Verify Midtrans signature
    const serverKey = gatewayData.api_credentials.server_key
    const { order_id, status_code, gross_amount, signature_key } = body
    
    const signatureString = order_id + status_code + gross_amount + serverKey
    const computedSignature = crypto.createHash('sha512').update(signatureString).digest('hex')
    
    if (signature_key !== computedSignature) {
      console.error('Invalid Midtrans signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Find transaction by payment_reference (which stores the order_id)
    console.log('🔍 Webhook: Looking for transaction with order_id:', order_id)
    
    let transaction = null
    
    // First try payment_reference
    const { data: refTransaction, error: refError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .select('*')
      .eq('payment_reference', order_id)
      .single()
      
    if (refTransaction) {
      transaction = refTransaction
      console.log('✅ Found transaction by payment_reference:', transaction.id)
    } else {
      console.log('❌ Not found by payment_reference, trying metadata...')
      
      // Try searching in metadata as backup
      const { data: metadataTransaction, error: metadataError } = await supabaseAdmin
        .from('indb_payment_transactions')
        .select('*')
        .contains('metadata', { midtrans_order_id: order_id })
        .single()
        
      if (metadataTransaction) {
        transaction = metadataTransaction
        console.log('✅ Found transaction in metadata:', transaction.id)
      } else {
        // Try gateway_transaction_id as last resort
        const { data: gatewayTransaction } = await supabaseAdmin
          .from('indb_payment_transactions')
          .select('*')
          .ilike('gateway_transaction_id', `%${order_id}%`)
          .single()
          
        if (gatewayTransaction) {
          transaction = gatewayTransaction
          console.log('✅ Found transaction by gateway_transaction_id:', transaction.id)
        } else {
          console.error('❌ Transaction not found anywhere for order_id:', order_id)
          return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }
      }
    }

    // Process the transaction
    return processWebhookTransaction(transaction, body, supabaseAdmin)
  } catch (error: any) {
    console.error('Midtrans webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processWebhookTransaction(transaction: any, body: any, supabaseAdmin: any) {
  try {
    console.log('🚀 Processing webhook for transaction:', transaction.id)
    console.log('📊 Midtrans status:', body.transaction_status, 'Fraud status:', body.fraud_status)
    
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

    console.log(`🔄 Updating transaction status from '${transaction.transaction_status}' to '${newStatus}'`)
    
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
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', transaction.id)

    if (updateError) {
      console.error('❌ Failed to update transaction:', updateError)
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
    }
    
    console.log('✅ Transaction updated successfully to status:', newStatus)

    // If payment is completed, activate user subscription
    if (newStatus === 'completed') {
      try {
        console.log('🎉 Payment completed! Activating subscription for user:', transaction.user_id)
        
        // Get package details
        const { data: packageData, error: packageError } = await supabaseAdmin
          .from('indb_payment_packages')
          .select('*')
          .eq('id', transaction.package_id)
          .single()

        if (packageError) {
          console.error('❌ Package not found:', packageError)
        } else if (packageData) {
          const billingPeriod = transaction.billing_period || 
                                (transaction.metadata as any)?.billing_period || 
                                'monthly'
          console.log('📅 Billing period:', billingPeriod)
          
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

          // 1. Store Midtrans transaction record
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

          const { data: midtransTransaction, error: midtransError } = await supabaseAdmin
            .from('indb_payment_midtrans_transactions')
            .insert(midtransTransactionData)
            .select()
            .single()

          if (midtransError) {
            console.error('❌ Failed to store Midtrans transaction:', midtransError)
          } else {
            console.log('✅ Midtrans transaction stored:', midtransTransaction.id)
          }

          // 2. Create recurring subscription record
          const subscriptionId = `SUB-${body.order_id}-${Date.now()}`
          const subscriptionData = {
            subscription_id: subscriptionId,
            user_id: transaction.user_id,
            package_id: transaction.package_id,
            transaction_id: midtransTransaction?.id,
            status: 'active',
            billing_period: billingPeriod,
            amount: parseFloat(body.gross_amount),
            currency: body.currency || 'IDR',
            started_at: now,
            next_billing_date: nextBillingDate,
            expires_at: expiresAt,
            card_token: body.saved_token_id, // For recurring payments
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

          const { data: subscription, error: subscriptionError } = await supabaseAdmin
            .from('indb_payment_midtrans_subscriptions')
            .insert(subscriptionData)
            .select()
            .single()

          if (subscriptionError) {
            console.error('❌ Failed to create subscription:', subscriptionError)
          } else {
            console.log('✅ Recurring subscription created:', subscription.id)
          }

          // 3. Update user profile with new package
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
            console.error('❌ Failed to update user profile:', profileError)
          } else {
            console.log('✅ Subscription activated successfully for user:', transaction.user_id)
            console.log(`📦 Package: ${packageData.name} (${billingPeriod})`)
            console.log(`⏰ Valid until: ${expiresAt.toISOString()}`)
            console.log(`🔄 Next billing: ${nextBillingDate.toISOString()}`)
          }
        }
      } catch (error) {
        console.error('❌ Failed to activate subscription:', error)
      }
    }

    return NextResponse.json({ status: 'OK' })

  } catch (error: any) {
    console.error('Midtrans webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}