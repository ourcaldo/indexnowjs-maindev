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
    console.log('[ORDER-API] Request received for order_id:', order_id)

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
      console.log('[ORDER-API] Authentication failed:', authError?.message || 'No user found')
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 })
    }
    
    console.log('[ORDER-API] User authenticated:', user.id)

    // Fetch transaction details with package and user profile information
    console.log('[ORDER-API] Searching for transaction with payment_reference:', order_id, 'user_id:', user.id)
    
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

    console.log('[ORDER-API] Transaction query result:', { 
      found: !!transaction, 
      error: transactionError?.message || null,
      data: transaction ? 'Transaction found' : 'No transaction'
    })

    if (transactionError || !transaction) {
      console.log('[ORDER-API] Transaction not found. Error:', transactionError?.message || 'No transaction data')
      return NextResponse.json({
        success: false,
        message: 'Order not found'
      }, { status: 404 })
    }
    
    console.log('[ORDER-API] Transaction found, order_id:', transaction.payment_reference)

    // Format response data
    const orderData = {
      order_id: transaction.payment_reference,
      transaction_id: transaction.gateway_transaction_id,
      status: transaction.transaction_status,
      payment_status: transaction.payment_status,
      amount: transaction.amount,
      currency: transaction.currency,
      payment_method: transaction.payment_method,
      billing_period: transaction.billing_period,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
      
      // Package information
      package: transaction.package,
      
      // Customer information from metadata
      customer_info: transaction.metadata?.customer_info || {},
      
      // Payment details (VA numbers, payment codes, etc.)
      payment_details: transaction.payment_details || {},
      
      // Full Midtrans response for additional details
      midtrans_response: transaction.gateway_response || transaction.midtrans_response || {}
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