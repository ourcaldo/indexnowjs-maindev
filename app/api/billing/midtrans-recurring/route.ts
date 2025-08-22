import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import MidtransRecurringHandler from '../channels/midtrans-recurring/handler'
import { PaymentData } from '../channels/shared/base-handler'

export async function POST(request: NextRequest) {
  console.log('⚠️ Using deprecated endpoint /api/billing/midtrans-recurring - Please use /api/billing/payment')
  
  try {
    // Authentication
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
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

    const body = await request.json()
    const { token_id, ...restBody } = body

    if (!token_id) {
      return NextResponse.json({
        success: false,
        message: 'Valid card token is required'
      }, { status: 400 })
    }

    const paymentData: PaymentData = {
      package_id: restBody.package_id,
      billing_period: restBody.billing_period,
      customer_info: restBody.customer_info,
      user
    }

    const handler = new MidtransRecurringHandler(paymentData, token_id)
    return await handler.execute()
    
  } catch (error) {
    console.error('Midtrans recurring error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Payment processing failed' 
    }, { status: 500 })
  }
}