import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get pagination parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const status = url.searchParams.get('status')
    const type = url.searchParams.get('type')

    const offset = (page - 1) * limit

    // Build query using existing payment transactions table with gateway join
    let query = supabaseAdmin
      .from('indb_payment_transactions')
      .select(`
        id,
        transaction_type,
        transaction_status,
        amount,
        currency,
        payment_method,
        gateway_transaction_id,
        created_at,
        updated_at,
        processed_at,
        verified_at,
        notes,
        metadata,
        payment_proof_url,
        gateway_response,
        gateway:indb_payment_gateways(id, name, slug),
        package:indb_payment_packages(id, name, slug)
      `, { count: 'exact' })
      .eq('user_id', user.id)

    // Apply filters
    if (status) {
      query = query.eq('transaction_status', status)
    }
    
    if (type) {
      query = query.eq('transaction_type', type)
    }

    // Apply pagination and ordering
    const { data: transactions, error: transactionsError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch billing history' },
        { status: 500 }
      )
    }

    // Get summary statistics
    const { data: summaryStats } = await supabaseAdmin
      .from('indb_payment_transactions')
      .select('transaction_status, amount, currency')
      .eq('user_id', user.id)

    // Calculate summary
    const summary = {
      total_transactions: summaryStats?.length || 0,
      completed_transactions: summaryStats?.filter(t => t.transaction_status === 'completed').length || 0,
      pending_transactions: summaryStats?.filter(t => t.transaction_status === 'pending').length || 0,
      failed_transactions: summaryStats?.filter(t => t.transaction_status === 'failed').length || 0,
      total_amount_spent: summaryStats
        ?.filter(t => t.transaction_status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0) || 0
    }

    // Transform transactions data
    const transformedTransactions = transactions?.map(transaction => ({
      id: transaction.id,
      order_id: transaction.id,
      transaction_type: transaction.transaction_type,
      transaction_status: transaction.transaction_status,
      amount: parseFloat(transaction.amount || '0'),
      currency: transaction.currency,
      billing_period: transaction.metadata?.billing_period || 'monthly',
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
      processed_at: transaction.processed_at,
      verified_at: transaction.verified_at,
      notes: transaction.notes,
      payment_proof_url: transaction.payment_proof_url,
      package_name: transaction.metadata?.package_name || (Array.isArray(transaction.package) ? transaction.package[0]?.name : transaction.package?.name) || 'Unknown Package',
      payment_method: transaction.payment_method || 'Unknown Method',
      gateway_transaction_id: transaction.gateway_transaction_id,
      customer_info: transaction.metadata?.customer_info,
      package: transaction.package || { name: transaction.metadata?.package_name || 'Unknown Package', slug: 'unknown' },
      gateway: transaction.gateway || { name: 'Unknown Gateway', slug: 'unknown' },
      subscription: null // Add this to match the interface
    })) || []

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    return NextResponse.json({
      transactions: transformedTransactions,
      summary,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: count || 0,
        items_per_page: limit,
        has_next: hasNext,
        has_prev: hasPrev
      }
    })

  } catch (error: any) {
    console.error('Billing history API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}