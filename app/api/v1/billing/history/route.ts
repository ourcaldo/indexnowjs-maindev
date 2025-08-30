import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

// GET /api/v1/billing/history - Get user's billing history
export async function GET(request: NextRequest) {
  try {
    const user = await requireUserAuth(request)
    
    // Fetch user's billing history from transactions table
    const { data: transactions, error } = await supabaseAdmin
      .from('indb_payment_transactions')
      .select(`
        *,
        package:indb_payment_packages(
          id,
          name,
          slug,
          price,
          currency,
          billing_period
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching billing history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch billing history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      transactions: transactions || []
    })

  } catch (error: any) {
    console.error('Billing history API error:', error)
    
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}