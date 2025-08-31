import { NextRequest, NextResponse } from 'next/server'

/**
 * DEPRECATED: Manual Recurring Payment Processing Route
 * 
 * This route has been disabled because Midtrans handles recurring payments automatically.
 * 
 * How Midtrans Recurring Payments Work:
 * 1. Customer subscribes with saved card token
 * 2. Midtrans automatically charges on scheduled dates
 * 3. Midtrans sends webhook notification to: /api/v1/payments/midtrans/webhook
 * 4. Webhook handler processes the payment confirmation and updates user access
 * 
 * No manual intervention required.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚫 DEPRECATED: Manual recurring payment processing disabled')
    console.log('📡 Midtrans handles recurring payments automatically via webhook notifications')
    console.log('🔔 Payment confirmations are processed at: /api/v1/payments/midtrans/webhook')
    
    return NextResponse.json({ 
      message: 'Recurring billing is handled automatically by Midtrans webhooks',
      processed: 0,
      failed: 0,
      status: 'disabled_automatic_processing',
      info: 'Midtrans processes recurring payments automatically and sends webhook notifications'
    })

  } catch (error: any) {
    console.error('❌ Recurring payment processing error:', error)
    return NextResponse.json(
      { error: 'This endpoint has been deprecated' },
      { status: 410 } // 410 Gone - indicates this endpoint is no longer available
    )
  }
}