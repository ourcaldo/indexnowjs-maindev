import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { BasePaymentHandler, PaymentData } from '../channels/shared/base-handler'

// Import handlers directly
import MidtransSnapHandler from '../channels/midtrans-snap/handler.js'
import MidtransRecurringHandler from '../channels/midtrans-recurring/handler.js'  
import BankTransferHandler from '../channels/bank-transfer/handler.js'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [Payment Router] Starting payment processing')
    
    // Authentication
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { payment_method, package_id, billing_period, customer_info, token_id } = body

    console.log(`📊 [Payment Router] Routing to channel: ${payment_method}`)

    // Prepare payment data
    const paymentData: PaymentData = {
      package_id,
      billing_period,
      customer_info,
      user
    }

    // Route to specific payment channel handler
    let handler: BasePaymentHandler

    switch (payment_method) {
      case 'midtrans_snap':
        handler = new MidtransSnapHandler(paymentData)
        break
      
      case 'midtrans_recurring':
        if (!token_id) {
          return NextResponse.json({
            success: false,
            message: 'Valid card token is required for recurring payments'
          }, { status: 400 })
        }
        handler = new MidtransRecurringHandler(paymentData, token_id)
        break
        
      case 'bank_transfer':
        handler = new BankTransferHandler(paymentData)
        break
        
      default:
        return NextResponse.json({
          success: false,
          message: `Unsupported payment method: ${payment_method}`
        }, { status: 400 })
    }

    // Execute payment processing
    const result = await handler.execute()
    return result

  } catch (error: any) {
    console.error('💥 [Payment Router] Error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Payment routing failed' 
    }, { status: 500 })
  }
}