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
    console.log('[ORDER-API] Received order_id:', order_id)

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
    console.log('[ORDER-API] Searching for payment_reference:', order_id, 'user_id:', user.id)
    
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

    console.log('[ORDER-API] Query result:', {
      found: !!transaction,
      error: transactionError?.message || null,
      transactionId: transaction?.id || null,
      paymentRef: transaction?.payment_reference || null
    })

    if (transactionError || !transaction) {
      console.log('[ORDER-API] Transaction not found. Checking if order exists for any user...')
      
      // Check if order exists for any user (debug only)
      const { data: anyUserTransaction } = await supabaseAdmin
        .from('indb_payment_transactions')
        .select('id, payment_reference, user_id, transaction_status')
        .eq('payment_reference', order_id)
        .single()
      
      console.log('[ORDER-API] Order exists for any user:', !!anyUserTransaction, 'user_id:', anyUserTransaction?.user_id || 'N/A')
      
      return NextResponse.json({
        success: false,
        message: 'Order not found'
      }, { status: 404 })
    }
    
    console.log('[ORDER-API] Transaction found successfully, order_id:', transaction.payment_reference)

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