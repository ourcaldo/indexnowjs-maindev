import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authService } from '@/lib/auth'

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
    const { package_id, billing_period, customer_info, payment_gateway_id } = body

    if (!package_id || !billing_period || !customer_info || !payment_gateway_id) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
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

    // Get payment gateway details
    const { data: gatewayData, error: gatewayError } = await supabase
      .from('indb_payment_gateways')
      .select('*')
      .eq('id', payment_gateway_id)
      .single()

    if (gatewayError || !gatewayData) {
      return NextResponse.json(
        { success: false, message: 'Payment method not found' },
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

    // Create transaction record using existing table structure
    const { data: transaction, error: transactionError } = await supabase
      .from('indb_payment_transactions')
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        package_id: package_id,
        gateway_id: payment_gateway_id,
        transaction_type: 'subscription',
        transaction_status: 'pending',
        amount: finalPrice,
        currency: packageData.currency || 'IDR',
        payment_method: gatewayData.name,
        payment_reference: orderId,
        gateway_response: gatewayData.configuration,
        metadata: {
          billing_period: billing_period,
          customer_info: customer_info,
          package_name: packageData.name,
          package_description: packageData.description,
          original_price: regularPrice,
          promo_price: promoPrice,
          discount_applied: promoPrice ? (regularPrice - promoPrice) : 0,
          order_id: orderId
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Transaction creation error:', transactionError)
      return NextResponse.json(
        { success: false, message: 'Failed to create transaction' },
        { status: 500 }
      )
    }

    // Send email notification
    try {
      await sendCheckoutEmailNotification({
        user: user,
        transaction: transaction,
        package: packageData,
        gateway: gatewayData,
        customer_info: customer_info
      })
    } catch (emailError) {
      console.error('Email notification error:', emailError)
      // Don't fail the checkout for email errors
    }

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      data: {
        order_id: orderId,
        transaction_id: transaction.id,
        amount: finalPrice,
        currency: packageData.currency || 'IDR',
        payment_instructions: gatewayData.configuration,
        package_name: packageData.name,
        payment_reference: transaction.payment_reference,
        redirect_url: `/dashboard/billing/order/${transaction.id}`
      }
    })

  } catch (error: any) {
    console.error('Checkout API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function sendCheckoutEmailNotification({ user, transaction, package: pkg, gateway, customer_info }: any) {
  try {
    console.log('🚀 Starting checkout email notification process...')
    
    const { emailService } = await import('@/lib/email/emailService')
    
    const bankConfig = gateway.configuration || {}
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    }

    const emailData = {
      customerName: `${customer_info.first_name}${customer_info.last_name ? ' ' + customer_info.last_name : ''}`,
      orderId: transaction.payment_reference,
      packageName: pkg.name,
      billingPeriod: transaction.metadata?.billing_period || 'N/A',
      amount: formatCurrency(transaction.amount),
      paymentMethod: gateway.name,
      bankName: bankConfig.bank_name,
      accountName: bankConfig.account_name,
      accountNumber: bankConfig.account_number,
      orderDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    console.log('📤 Sending billing confirmation email to:', customer_info.email)
    await emailService.sendBillingConfirmation(customer_info.email, emailData)
    console.log('✅ Checkout confirmation email sent successfully!')

  } catch (error) {
    console.error('❌ Failed to send checkout email notification:', error)
    throw error
  }
}