import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthUser } from '@/lib/auth'
import { PaymentServiceFactory } from '@/lib/services/payments'
import { supabaseAdmin } from '@/lib/database'

// POST /api/v1/payments/channels/snap - Process Midtrans Snap payment
export async function POST(request: NextRequest) {
  try {
    const user = await getServerAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const body = await request.json()

    const { package_id, billing_period, token_id, customer_info } = body

    // Validate required fields
    if (!package_id || !billing_period || !token_id || !customer_info) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get package details
    const { data: packageData, error: packageError } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('id', package_id)
      .eq('is_active', true)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { error: 'Invalid package' },
        { status: 400 }
      )
    }

    // Get Midtrans configuration
    const { data: midtransConfig, error: configError } = await supabaseAdmin
      .from('indb_payment_gateway_configs')
      .select('*')
      .eq('gateway_name', 'midtrans')
      .eq('is_active', true)
      .single()

    if (configError || !midtransConfig) {
      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 500 }
      )
    }

    // Create Midtrans service via factory
    const midtransService = PaymentServiceFactory.createMidtransService('snap', midtransConfig)

    // Generate unique order ID
    const orderId = `SNAP_${user.id}_${Date.now()}`

    // Calculate amount based on billing period
    const amount = billing_period === 'yearly' 
      ? packageData.price * 12 * 0.8  // 20% discount for yearly
      : packageData.price

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .insert({
        user_id: user.id,
        order_id: orderId,
        package_id: package_id,
        amount_usd: amount,
        currency: packageData.currency,
        billing_period,
        payment_method: 'midtrans_snap',
        gateway_name: 'midtrans',
        status: 'pending',
        payment_status: 'pending',
        customer_info,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (transactionError || !transaction) {
      console.error('Failed to create transaction:', transactionError)
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      )
    }

    // Process payment with Midtrans
    try {
      const chargeResult = await midtransService.processPayment({
        order_id: orderId,
        amount_usd: amount,
        currency: packageData.currency,
        customer_details: {
          first_name: customer_info.first_name,
          last_name: customer_info.last_name,
          email: customer_info.email,
          phone: customer_info.phone || ''
        },
        item_details: {
          name: `${packageData.name} - ${billing_period}`,
          description: packageData.description
        },
        metadata: {
          token_id: token_id,
          billing_period: billing_period,
          package_id: package_id
        }
      })

      // Update transaction with Midtrans response
      await supabaseAdmin
        .from('indb_payment_transactions')
        .update({
          transaction_id: chargeResult.transaction_id,
          midtrans_response: chargeResult,
          status: chargeResult.transaction_status === 'capture' ? 'completed' : 'pending',
          payment_status: chargeResult.transaction_status === 'capture' ? 'paid' : 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id)

      return NextResponse.json({
        success: true,
        transaction: {
          id: transaction.id,
          order_id: orderId,
          status: chargeResult.transaction_status,
          redirect_url: chargeResult.redirect_url,
          requires_redirect: !!chargeResult.redirect_url
        }
      })

    } catch (midtransError: any) {
      console.error('Midtrans payment error:', midtransError)
      
      // Update transaction as failed
      await supabaseAdmin
        .from('indb_payment_transactions')
        .update({
          status: 'failed',
          payment_status: 'failed',
          error_message: midtransError.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id)

      return NextResponse.json(
        { error: 'Payment processing failed' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Snap payment API error:', error)
    
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}