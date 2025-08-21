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

    // Find transaction by order_id
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .select('*')
      .eq('order_id', order_id)
      .single()

    if (transactionError || !transaction) {
      console.error('Transaction not found:', order_id)
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

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
      console.error('Failed to update transaction:', updateError)
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
    }

    // If payment is completed, activate user subscription
    if (newStatus === 'completed') {
      try {
        // Get package details
        const { data: packageData } = await supabaseAdmin
          .from('indb_payment_packages')
          .select('*')
          .eq('id', transaction.package_id)
          .single()

        if (packageData) {
          // Calculate subscription period
          const billingPeriod = transaction.billing_period || 'monthly'
          const now = new Date()
          let expiresAt = new Date(now)

          switch (billingPeriod) {
            case 'weekly':
              expiresAt.setDate(now.getDate() + 7)
              break
            case 'monthly':
              expiresAt.setMonth(now.getMonth() + 1)
              break
            case 'quarterly':
              expiresAt.setMonth(now.getMonth() + 3)
              break
            case 'annually':
              expiresAt.setFullYear(now.getFullYear() + 1)
              break
          }

          // Update user profile with new package
          await supabaseAdmin
            .from('indb_auth_user_profiles')
            .update({
              package_id: transaction.package_id,
              subscribed_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: now.toISOString()
            })
            .eq('user_id', transaction.user_id)

          console.log(`Subscription activated for user ${transaction.user_id}`)
        }
      } catch (error) {
        console.error('Failed to activate subscription:', error)
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