import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import crypto from 'crypto'

// POST /api/v1/payments/midtrans/webhook - Handle Midtrans webhook notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const notification = JSON.parse(body)
    
    // Verify signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) {
      console.error('Missing MIDTRANS_SERVER_KEY')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const signatureKey = notification.signature_key
    const orderId = notification.order_id
    const statusCode = notification.status_code
    const grossAmount = notification.gross_amount
    
    const expectedSignature = crypto
      .createHash('sha512')
      .update(orderId + statusCode + grossAmount + serverKey)
      .digest('hex')

    if (signatureKey !== expectedSignature) {
      console.error('Invalid signature for webhook:', { orderId, signatureKey, expectedSignature })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log(`📡 [Midtrans Webhook] Processing notification for order: ${orderId}`)
    console.log(`📡 [Midtrans Webhook] Transaction status: ${notification.transaction_status}`)
    console.log(`📡 [Midtrans Webhook] Full notification:`, notification)

    // Find the transaction in our database
    const { data: transaction, error: findError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (findError || !transaction) {
      console.error('Transaction not found for order:', orderId, 'error:', findError)
      return NextResponse.json({ error: 'Invalid request' }, { status: 404 })
    }

    // Process different transaction statuses
    let newStatus = transaction.status
    let newPaymentStatus = transaction.payment_status

    switch (notification.transaction_status) {
      case 'capture':
        if (notification.fraud_status === 'accept') {
          newStatus = 'completed'
          newPaymentStatus = 'paid'
        }
        break
      case 'settlement':
        newStatus = 'completed'
        newPaymentStatus = 'paid'
        break
      case 'pending':
        newStatus = 'pending'
        newPaymentStatus = 'pending'
        break
      case 'deny':
      case 'cancel':
      case 'expire':
        newStatus = 'failed'
        newPaymentStatus = 'failed'
        break
      case 'failure':
        newStatus = 'failed'
        newPaymentStatus = 'failed'
        break
    }

    // Extract payment details for VA numbers and payment codes
    const paymentDetails: any = {}
    
    if (notification.payment_type === 'bank_transfer' && notification.va_numbers) {
      paymentDetails.va_numbers = notification.va_numbers
      paymentDetails.payment_method = 'bank_transfer'
    }
    
    if (notification.payment_type === 'cstore') {
      paymentDetails.payment_code = notification.payment_code
      paymentDetails.store = notification.store
      paymentDetails.payment_method = 'convenience_store'
    }
    
    if (notification.expiry_time) {
      paymentDetails.expires_at = notification.expiry_time
    }

    // Update transaction in database
    const { error: updateError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .update({
        status: newStatus,
        payment_status: newPaymentStatus,
        midtrans_response: notification,
        payment_details: paymentDetails,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id)

    if (updateError) {
      console.error('Failed to update transaction:', updateError)
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
    }

    // If payment is successful, activate user's package
    if (newStatus === 'completed' && newPaymentStatus === 'paid') {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .update({
          package_id: transaction.package_id,
          subscribed_at: new Date().toISOString(),
          expires_at: transaction.billing_period === 'monthly' 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', transaction.user_id)

      if (profileUpdateError) {
        console.error('Failed to update user profile after payment:', profileUpdateError)
      } else {
        console.log(`✅ Activated package for user ${transaction.user_id}`)
      }
    }

    console.log(`✅ [Midtrans Webhook] Successfully processed ${orderId}: ${newStatus}`)

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully',
      order_id: orderId,
      status: newStatus
    })

  } catch (error: any) {
    console.error('Midtrans webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}