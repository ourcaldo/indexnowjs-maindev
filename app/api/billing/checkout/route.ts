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
        payment_reference: transaction.payment_reference
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
  // Use existing SMTP configuration from .env
  try {
    const nodemailer = require('nodemailer')
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP configuration not complete, skipping email notification')
      return
    }

    // Create transporter using existing SMTP settings
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })

    const bankConfig = gateway.configuration || {}
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation - IndexNow Pro</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1A1A1A; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .order-details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .payment-info { background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>IndexNow Pro</h1>
            <h2>Order Confirmation</h2>
          </div>
          
          <div class="content">
            <p>Dear ${customer_info.first_name} ${customer_info.last_name},</p>
            
            <p>Thank you for your order! We've received your subscription request and are processing it.</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> ${transaction.payment_reference}</p>
              <p><strong>Package:</strong> ${pkg.name}</p>
              <p><strong>Billing Period:</strong> ${transaction.metadata?.billing_period}</p>
              <p><strong>Amount:</strong> ${formatCurrency(transaction.amount)}</p>
              <p><strong>Status:</strong> Pending Payment</p>
            </div>
            
            <div class="payment-info">
              <h3>Payment Instructions</h3>
              <p><strong>Payment Method:</strong> ${gateway.name}</p>
              ${bankConfig.bank_name ? `
                <p><strong>Bank:</strong> ${bankConfig.bank_name}</p>
                <p><strong>Account Name:</strong> ${bankConfig.account_name}</p>
                <p><strong>Account Number:</strong> ${bankConfig.account_number}</p>
              ` : ''}
              <p><strong>Amount to Pay:</strong> ${formatCurrency(transaction.amount)}</p>
              <p>Please include your Order ID (${transaction.payment_reference}) in the payment reference.</p>
            </div>
            
            <p>Once we receive your payment, we'll activate your subscription and send you a confirmation email.</p>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Best regards,<br>The IndexNow Pro Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME || 'IndexNow Pro'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: customer_info.email,
      subject: `Order Confirmation - ${pkg.name} Subscription`,
      html: emailHtml
    }

    await transporter.sendMail(mailOptions)
    console.log('Checkout confirmation email sent successfully via SMTP')

  } catch (error) {
    console.error('Failed to send checkout email:', error)
    throw error
  }
}