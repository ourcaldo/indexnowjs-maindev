import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

    // Route to specific payment channel API
    const channelRoutes = {
      'midtrans_snap': '/api/billing/channels/midtrans-snap',
      'midtrans_recurring': '/api/billing/channels/midtrans-recurring', 
      'bank_transfer': '/api/billing/channels/bank-transfer'
    }

    const channelUrl = channelRoutes[payment_method as keyof typeof channelRoutes]
    
    if (!channelUrl) {
      return NextResponse.json({
        success: false,
        message: `Unsupported payment method: ${payment_method}`
      }, { status: 400 })
    }

    // Prepare request body for channel
    const channelRequestBody = {
      package_id,
      billing_period,
      customer_info,
      user_data: {
        full_name: `${customer_info.first_name} ${customer_info.last_name}`.trim(),
        email: customer_info.email,
        phone_number: customer_info.phone,
        country: customer_info.country
      }
    }

    // Add token_id for recurring payments
    if (payment_method === 'midtrans_recurring' && token_id) {
      (channelRequestBody as any).token_id = token_id
    }

    // Forward to specific payment channel
    const channelRequest = new Request(`${request.nextUrl.origin}${channelUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(channelRequestBody)
    })

    const channelResponse = await fetch(channelRequest)
    const channelResult = await channelResponse.json()

    return NextResponse.json(channelResult, { status: channelResponse.status })

  } catch (error: any) {
    console.error('💥 [Payment Router] Error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Payment routing failed' 
    }, { status: 500 })
  }
}