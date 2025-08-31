import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  try {
    const { order_id } = await params

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

    // Fetch transaction details with package and user profile information
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('indb_payment_transactions')
      .select(`
        *,
        package:indb_payment_packages(id, name, description, features, quota_limits),
        user_profile:indb_auth_user_profiles(full_name, email, phone_number)
      `)
      .eq('payment_reference', order_id)
      .eq('user_id', user.id)
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json({
        success: false,
        message: 'Order not found'
      }, { status: 404 })
    }

    // Format response data
    const orderData = {
      order_id: transaction.payment_reference,
      transaction_id: transaction.gateway_transaction_id,
      status: transaction.transaction_status,
      payment_status: transaction.transaction_status, // Use transaction_status for payment status
      amount: transaction.amount,
      currency: transaction.currency,
      payment_method: transaction.payment_method,
      billing_period: transaction.billing_period || 'one-time',
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
      
      // Package information
      package: transaction.package,
      
      // Customer information from metadata
      customer_info: transaction.metadata?.customer_info || {},
      
      // Payment details from metadata (VA numbers, payment codes, etc.)
      payment_details: transaction.metadata?.payment_details || transaction.gateway_response?.va_numbers ? {
        va_numbers: transaction.gateway_response.va_numbers,
        payment_code: transaction.gateway_response.payment_code,
        store: transaction.gateway_response.store,
        expires_at: transaction.gateway_response.expiry_time
      } : {},
      
      // Full Midtrans response for additional details
      midtrans_response: transaction.gateway_response || {}
    }

    return NextResponse.json({
      success: true,
      data: orderData
    })

  } catch (error: any) {
    console.error('Error fetching order details:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}