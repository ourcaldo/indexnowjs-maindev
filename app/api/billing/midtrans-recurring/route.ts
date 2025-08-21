import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createMidtransService } from '@/lib/midtrans-service'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      package_id, 
      billing_period, 
      customer_info, 
      card_data 
    } = body

    if (!package_id || !billing_period || !customer_info || !card_data) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate card data
    if (!card_data.card_number || !card_data.expiry_month || !card_data.expiry_year || !card_data.cvv || !card_data.cardholder_name) {
      return NextResponse.json(
        { success: false, message: 'Complete card information is required' },
        { status: 400 }
      )
    }

    // Get package details
    const { data: packageData, error: packageError } = await supabase
      .from('indb_payment_packages')
      .select('*')
      .eq('id', package_id)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { success: false, message: 'Package not found' },
        { status: 404 }
      )
    }

    // Get Midtrans gateway configuration
    const { data: gatewayData, error: gatewayError } = await supabase
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'midtrans')
      .eq('is_active', true)
      .single()

    if (gatewayError || !gatewayData) {
      return NextResponse.json(
        { success: false, message: 'Midtrans payment gateway not available' },
        { status: 404 }
      )
    }

    // Calculate price based on billing period
    const pricingTiers = packageData.pricing_tiers || {}
    const regularPrice = pricingTiers.regular?.[billing_period] || packageData.price
    const promoPrice = pricingTiers.promo?.[billing_period]
    const finalPrice = promoPrice || regularPrice

    // Generate unique order ID
    const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Initialize Midtrans service
    const midtransService = createMidtransService(gatewayData)

    // Create recurring payment (initial charge + subscription)
    const recurringPayment = await midtransService.createRecurringPayment({
      order_id: orderId,
      amount_usd: finalPrice,
      billing_period: billing_period as 'monthly' | 'yearly',
      card_data: {
        card_number: card_data.card_number,
        expiry_month: card_data.expiry_month,
        expiry_year: card_data.expiry_year,
        cvv: card_data.cvv,
      },
      customer_details: {
        first_name: customer_info.first_name,
        last_name: customer_info.last_name,
        email: customer_info.email,
        phone: customer_info.phone,
      },
      package_details: {
        name: packageData.name,
        description: packageData.description,
      },
      metadata: {
        user_id: user.id,
        package_id: package_id,
        billing_period: billing_period,
        order_id: orderId,
      },
    })

    // Create transaction record in database
    const { data: transactionData, error: transactionError } = await supabase
      .from('indb_payment_transactions')
      .insert({
        user_id: user.id,
        package_id: package_id,
        gateway_id: gatewayData.id,
        transaction_type: 'subscription',
        transaction_status: 'completed',
        amount: finalPrice,
        currency: 'USD',
        payment_method: 'credit_card',
        payment_reference: recurringPayment.initial_charge.transaction_id,
        gateway_transaction_id: recurringPayment.initial_charge.transaction_id,
        gateway_order_id: orderId,
        billing_period: billing_period,
        customer_info: customer_info,
        gateway_response: recurringPayment.initial_charge,
        metadata: {
          subscription_id: recurringPayment.subscription.id,
          saved_token_id: recurringPayment.initial_charge.saved_token_id,
          masked_card: recurringPayment.initial_charge.masked_card,
          subscription_status: recurringPayment.subscription.status,
          next_execution_at: recurringPayment.subscription.schedule.next_execution_at,
        },
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Failed to create transaction record:', transactionError)
      return NextResponse.json(
        { success: false, message: 'Failed to save transaction' },
        { status: 500 }
      )
    }

    // Create subscription record
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('indb_payment_subscriptions')
      .insert({
        user_id: user.id,
        package_id: package_id,
        transaction_id: transactionData.id,
        subscription_status: 'active',
        billing_period: billing_period,
        amount_paid: finalPrice,
        currency: 'USD',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
        auto_renew: true,
        payment_reference: recurringPayment.subscription.id,
        metadata: {
          midtrans_subscription_id: recurringPayment.subscription.id,
          saved_token_id: recurringPayment.initial_charge.saved_token_id,
          masked_card: recurringPayment.initial_charge.masked_card,
        },
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Failed to create subscription record:', subscriptionError)
    }

    // Update user package
    const { error: userUpdateError } = await supabase
      .from('indb_auth_user_profiles')
      .update({
        package_id: package_id,
        subscribed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (billing_period === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('user_id', user.id)

    if (userUpdateError) {
      console.error('Failed to update user profile:', userUpdateError)
    }

    return NextResponse.json({
      success: true,
      message: 'Recurring payment setup successfully',
      data: {
        transaction_id: transactionData.id,
        subscription_id: subscriptionData?.id,
        midtrans_subscription_id: recurringPayment.subscription.id,
        order_id: orderId,
        amount: finalPrice,
        currency: 'USD',
        billing_period: billing_period,
        next_billing_date: recurringPayment.subscription.schedule.next_execution_at,
        masked_card: recurringPayment.initial_charge.masked_card,
        redirect_url: `/dashboard/settings/plans-billing/orders/${transactionData.id}`,
      },
    })

  } catch (error) {
    console.error('Midtrans recurring payment error:', error)
    
    let errorMessage = 'Payment processing failed'
    if (error instanceof Error) {
      if (error.message.includes('Initial charge failed')) {
        errorMessage = 'Payment failed. Please check your card details and try again.'
      } else if (error.message.includes('Card token was not saved')) {
        errorMessage = 'Card could not be saved for recurring payments. Please try again.'
      } else if (error.message.includes('Midtrans API Error')) {
        errorMessage = 'Payment gateway error. Please try again or contact support.'
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    )
  }
}