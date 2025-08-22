import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import MidtransSnapHandler from '../channels/midtrans-snap/handler.js'
import { PaymentData } from '../channels/shared/base-handler'

export async function POST(request: NextRequest) {
  console.log('⚠️ Using deprecated endpoint /api/billing/midtrans-snap - Please use /api/billing/payment')
  
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
    const paymentData: PaymentData = {
      package_id: body.package_id,
      billing_period: body.billing_period,
      customer_info: body.customer_info,
      user
    }

    const handler = new MidtransSnapHandler(paymentData)
    return await handler.execute()
    
  } catch (error) {
    console.error('Midtrans Snap error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Payment processing failed' 
    }, { status: 500 })
  }
}