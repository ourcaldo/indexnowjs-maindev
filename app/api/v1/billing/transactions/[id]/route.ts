import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Fetch transaction with related data
    const { data: transaction, error } = await supabase
      .from('indb_payment_transactions')
      .select(`
        *,
        package:indb_payment_packages(*),
        gateway:indb_payment_gateways(*)
      `)
      .eq('id', (await params).id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Database error fetching transaction:', error)
      // Check if this is a "not found" error vs actual database error
      if (error.code === 'PGRST116' || error.message?.includes('no rows returned')) {
        return NextResponse.json(
          { success: false, message: 'Access denied' },
          { status: 404 }
        )
      }
      // Actual database/server error
      return NextResponse.json(
        { success: false, message: 'Unable to process request' },
        { status: 500 }
      )
    }

    if (!transaction) {
      console.error('Transaction not found for user:', user.id, 'transaction_id:', (await params).id)
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 404 }
      )
    }

    // Parse customer info from metadata
    const customerInfo = transaction.metadata?.customer_info || {}

    return NextResponse.json({
      success: true,
      transaction: {
        ...transaction,
        customer_info: customerInfo
      }
    })

  } catch (error) {
    console.error('Transaction fetch error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}