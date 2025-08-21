import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createMidtransService } from '@/lib/midtrans-service'

export async function POST(request: NextRequest) {
  try {
    console.log('\n🔐 ============= 3DS AUTHENTICATION CALLBACK =============')
    
    const { transaction_id, order_id } = await request.json()
    
    console.log('📋 3DS Callback received:', {
      transaction_id,
      order_id
    })

    if (!transaction_id || !order_id) {
      return NextResponse.json(
        { success: false, message: 'Missing transaction_id or order_id' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Midtrans configuration
    const { data: midtransGateway, error: gatewayError } = await supabase
      .from('indb_payment_gateways')
      .select('*')
      .eq('gateway_name', 'midtrans')
      .eq('is_active', true)
      .single()

    if (gatewayError || !midtransGateway) {
      console.log('❌ Failed to fetch Midtrans gateway configuration')
      return NextResponse.json(
        { success: false, message: 'Midtrans payment gateway not configured' },
        { status: 500 }
      )
    }

    const { server_key, client_key, merchant_id } = midtransGateway.api_credentials
    const { environment } = midtransGateway.configuration

    // Initialize Midtrans service
    const midtransService = createMidtransService({
      server_key,
      client_key,
      environment,
      merchant_id
    })

    // Get transaction status to check 3DS result
    console.log('🔍 Checking transaction status after 3DS authentication')
    const transactionStatus = await midtransService.getTransactionStatus(transaction_id)
    
    console.log('📋 Transaction status after 3DS:', {
      transaction_status: transactionStatus.transaction_status,
      fraud_status: transactionStatus.fraud_status,
      status_code: transactionStatus.status_code,
      status_message: transactionStatus.status_message,
      has_saved_token: !!transactionStatus.saved_token_id
    })

    // Check if transaction was successful after 3DS
    if (transactionStatus.transaction_status === 'capture' || transactionStatus.transaction_status === 'settlement') {
      console.log('✅ 3DS Authentication successful, continuing with subscription creation')
      
      // Continue with subscription creation using saved_token_id
      const savedTokenId = transactionStatus.saved_token_id
      if (!savedTokenId) {
        throw new Error('No saved token ID found after successful 3DS authentication')
      }

      // TODO: Here we should continue with subscription creation and user profile updates
      // This would be the same logic from the original endpoint after successful charge
      
      return NextResponse.json({
        success: true,
        requires_subscription_creation: true,
        saved_token_id: savedTokenId,
        transaction_id,
        order_id,
        message: '3DS authentication successful, creating subscription'
      })

    } else if (transactionStatus.transaction_status === 'pending') {
      console.log('⏳ Transaction is still pending after 3DS')
      return NextResponse.json({
        success: false,
        message: 'Transaction is still pending. Please wait for notification.',
        transaction_status: 'pending'
      })

    } else {
      console.log('❌ 3DS Authentication failed')
      return NextResponse.json({
        success: false,
        message: `3DS authentication failed: ${transactionStatus.status_message}`,
        transaction_status: transactionStatus.transaction_status
      })
    }

  } catch (error: any) {
    console.error('❌ 3DS callback error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error during 3DS callback' },
      { status: 500 }
    )
  }
}