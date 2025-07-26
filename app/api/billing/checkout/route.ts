import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CheckoutRequest {
  package_id: string
  billing_period: string
  payment_gateway_id: string
  customer_info: {
    first_name: string
    last_name: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zip_code: string
    country: string
    description?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequest = await request.json()
    const { package_id, billing_period, payment_gateway_id, customer_info } = body

    // Validate required fields
    if (!package_id || !billing_period || !payment_gateway_id || !customer_info.email) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 })
    }

    // Fetch package details
    const { data: packageData, error: packageError } = await supabase
      .from('indb_payment_packages')
      .select('*')
      .eq('id', package_id)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json({
        success: false,
        message: 'Package not found'
      }, { status: 404 })
    }

    // Fetch payment gateway details
    const { data: gatewayData, error: gatewayError } = await supabase
      .from('indb_payment_gateways')
      .select('*')
      .eq('id', payment_gateway_id)
      .single()

    if (gatewayError || !gatewayData) {
      return NextResponse.json({
        success: false,
        message: 'Payment gateway not found'
      }, { status: 404 })
    }

    // Calculate pricing
    let finalPrice = packageData.price
    let discount = 0
    
    if (packageData.pricing_tiers && packageData.pricing_tiers[billing_period]) {
      const tier = packageData.pricing_tiers[billing_period]
      finalPrice = tier.promo_price || tier.regular_price
      if (tier.promo_price) {
        discount = Math.round(((tier.regular_price - tier.promo_price) / tier.regular_price) * 100)
      }
    }

    // Create order record (you might want to create an orders table)
    const orderData = {
      id: crypto.randomUUID(),
      package_id,
      billing_period,
      payment_gateway_id,
      customer_info,
      amount: finalPrice,
      currency: packageData.currency || 'IDR',
      status: 'pending',
      created_at: new Date().toISOString()
    }

    // Send email notification
    try {
      await sendOrderConfirmationEmail({
        customer_info,
        package: packageData,
        billing_period,
        amount: finalPrice,
        currency: packageData.currency || 'IDR',
        discount,
        payment_gateway: gatewayData,
        order_id: orderData.id
      })
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
      // Continue with the process even if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Order submitted successfully',
      order_id: orderData.id
    })

  } catch (error) {
    console.error('Checkout API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

async function sendOrderConfirmationEmail({
  customer_info,
  package: pkg,
  billing_period,
  amount,
  currency,
  discount,
  payment_gateway,
  order_id
}: {
  customer_info: any
  package: any
  billing_period: string
  amount: number
  currency: string
  discount: number
  payment_gateway: any
  order_id: string
}) {
  // Create SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  // Generate payment instructions based on gateway type
  let paymentInstructions = ''
  
  if (payment_gateway.slug === 'bank_transfer' && payment_gateway.configuration) {
    const config = payment_gateway.configuration
    paymentInstructions = `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1a1a1a; margin: 0 0 15px 0;">Bank Transfer Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6c757d; font-weight: 500;">Bank Name:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${config.bank_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6c757d; font-weight: 500;">Account Name:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${config.account_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6c757d; font-weight: 500;">Account Number:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600; font-family: monospace;">${config.account_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6c757d; font-weight: 500;">Amount:</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600; font-size: 18px;">Rp ${amount.toLocaleString()}</td>
          </tr>
        </table>
        <p style="color: #6c757d; font-size: 14px; margin: 15px 0 0 0;">
          Please include <strong>Order ID: ${order_id}</strong> in the transfer description.
        </p>
      </div>
    `
  }

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - IndexNow Pro</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; font-size: 28px; margin: 0;">IndexNow Pro</h1>
          <p style="color: #6c757d; margin: 5px 0 0 0;">Professional URL Indexing Service</p>
        </div>

        <!-- Order Confirmation -->
        <div style="background: #ffffff; border: 1px solid #e0e6ed; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
          <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 10px 0;">Order Confirmation</h2>
          <p style="color: #6c757d; margin: 0 0 20px 0;">
            Thank you for upgrading to <strong>${pkg.name} Plan</strong>! Your order has been received and is being processed.
          </p>

          <!-- Order Details -->
          <div style="background: #f7f9fc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1a1a1a; margin: 0 0 15px 0;">Order Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6c757d;">Order ID:</td>
                <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600; font-family: monospace;">${order_id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d;">Plan:</td>
                <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600;">${pkg.name} Plan</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d;">Billing Period:</td>
                <td style="padding: 8px 0; color: #1a1a1a; font-weight: 600; text-transform: capitalize;">${billing_period}</td>
              </tr>
              ${discount > 0 ? `
              <tr>
                <td style="padding: 8px 0; color: #6c757d;">Discount:</td>
                <td style="padding: 8px 0; color: #4bb543; font-weight: 600;">${discount}% OFF</td>
              </tr>
              ` : ''}
              <tr style="border-top: 1px solid #e0e6ed;">
                <td style="padding: 15px 0 8px 0; color: #1a1a1a; font-weight: 600; font-size: 16px;">Total Amount:</td>
                <td style="padding: 15px 0 8px 0; color: #1a1a1a; font-weight: 700; font-size: 18px;">Rp ${amount.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <!-- Customer Information -->
          <div style="background: #f7f9fc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1a1a1a; margin: 0 0 15px 0;">Customer Information</h3>
            <p style="margin: 5px 0; color: #1a1a1a;"><strong>Name:</strong> ${customer_info.first_name} ${customer_info.last_name}</p>
            <p style="margin: 5px 0; color: #1a1a1a;"><strong>Email:</strong> ${customer_info.email}</p>
            <p style="margin: 5px 0; color: #1a1a1a;"><strong>Phone:</strong> ${customer_info.phone}</p>
            <p style="margin: 5px 0; color: #1a1a1a;"><strong>Address:</strong> ${customer_info.address}, ${customer_info.city}, ${customer_info.state} ${customer_info.zip_code}, ${customer_info.country}</p>
          </div>

          <!-- Payment Instructions -->
          <h3 style="color: #1a1a1a; margin: 30px 0 15px 0;">Payment Instructions</h3>
          <p style="color: #6c757d; margin: 0 0 15px 0;">
            Please complete your payment using the method below. Your subscription will be activated once payment is confirmed.
          </p>
          
          ${paymentInstructions}

          <!-- Next Steps -->
          <div style="background: #e8f4fd; border-left: 4px solid #3d8bff; padding: 20px; margin: 30px 0;">
            <h4 style="color: #1a1a1a; margin: 0 0 10px 0;">What happens next?</h4>
            <ol style="color: #6c757d; margin: 0; padding-left: 20px;">
              <li style="margin: 5px 0;">Complete the payment using the instructions above</li>
              <li style="margin: 5px 0;">Send payment confirmation to this email</li>
              <li style="margin: 5px 0;">We'll verify and activate your subscription within 2-4 hours</li>
              <li style="margin: 5px 0;">You'll receive an activation confirmation email</li>
            </ol>
          </div>

          <!-- Features Reminder -->
          <div style="margin: 30px 0;">
            <h3 style="color: #1a1a1a; margin: 0 0 15px 0;">Your New Plan Features</h3>
            <div style="display: grid; gap: 8px;">
              ${pkg.features ? pkg.features.slice(0, 5).map((feature: string) => `
                <div style="display: flex; align-items: center; color: #6c757d;">
                  <span style="color: #4bb543; margin-right: 8px;">✓</span>
                  ${feature}
                </div>
              `).join('') : ''}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e0e6ed; margin-top: 30px;">
          <p style="color: #6c757d; margin: 0 0 10px 0;">
            Need help? Contact our support team at <a href="mailto:support@indexnow.studio" style="color: #3d8bff;">support@indexnow.studio</a>
          </p>
          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            © 2025 IndexNow Pro. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  // Send email
  const mailOptions = {
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: customer_info.email,
    subject: `Order Confirmation - ${pkg.name} Plan Upgrade`,
    html: emailHTML,
  }

  await transporter.sendMail(mailOptions)
}