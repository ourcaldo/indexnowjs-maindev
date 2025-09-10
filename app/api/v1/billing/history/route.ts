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

    // Get detail level from query params (default to 'basic' for performance)
    const detail = url.searchParams.get('detail') || 'basic'
    
    // Build optimized query - exclude heavy fields unless explicitly requested
    const baseFields = [
      'id',
      'transaction_type',
      'transaction_status', 
      'amount',
      'currency',
      'payment_method',
      'gateway_transaction_id',
      'created_at',
      'updated_at',
      'processed_at',
      'verified_at',
      'notes',
      'payment_proof_url',
      'gateway:indb_payment_gateways(id, name, slug)',
      'package:indb_payment_packages(id, name, slug)'
    ]
    
    // Only include heavy fields when detail=full is requested
    const selectFields = detail === 'full' 
      ? [...baseFields, 'metadata', 'gateway_response'].join(',')
      : baseFields.join(',')

    let query = supabaseAdmin
      .from('indb_payment_transactions')
      .select(selectFields, { count: 'exact' })
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

    // Get optimized summary statistics using aggregation functions
    const [
      { count: totalCount },
      { count: completedCount },
      { count: pendingCount },
      { count: failedCount },
      { data: amountStats }
    ] = await Promise.all([
      supabaseAdmin
        .from('indb_payment_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabaseAdmin
        .from('indb_payment_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('transaction_status', 'completed'),
      supabaseAdmin
        .from('indb_payment_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('transaction_status', ['pending', 'pending_3ds']),
      supabaseAdmin
        .from('indb_payment_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('transaction_status', 'failed'),
      supabaseAdmin
        .from('indb_payment_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('transaction_status', 'completed')
    ])

    // Calculate summary using aggregated data (much more efficient)
    const summary = {
      total_transactions: totalCount || 0,
      completed_transactions: completedCount || 0,
      pending_transactions: pendingCount || 0,
      failed_transactions: failedCount || 0,
      total_amount_spent: amountStats?.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0) || 0
    }

    // Transform transactions data - handle optional metadata fields based on detail level
    const transformedTransactions = (transactions || [])
      .map(transaction => {
        // Ensure we have a valid transaction object
        if (!transaction || typeof transaction !== 'object' || 'error' in transaction) {
          return null
        }
        
        // Use type assertion to help TypeScript understand the structure
        const tx = transaction as any
        
        const baseData = {
          id: tx.id,
          order_id: tx.id,
          transaction_type: tx.transaction_type,
          transaction_status: tx.transaction_status,
          amount: parseFloat(tx.amount || '0'),
          currency: tx.currency,
          created_at: tx.created_at,
          updated_at: tx.updated_at,
          processed_at: tx.processed_at,
          verified_at: tx.verified_at,
          notes: tx.notes,
          payment_proof_url: tx.payment_proof_url,
          payment_method: tx.payment_method || 'Unknown Method',
          gateway_transaction_id: tx.gateway_transaction_id,
          package: tx.package || { name: 'Unknown Package', slug: 'unknown' },
          gateway: tx.gateway || { name: 'Unknown Gateway', slug: 'unknown' },
          subscription: null
        }
        
        // Add metadata-dependent fields
        if (detail === 'full' && tx.metadata) {
          return {
            ...baseData,
            billing_period: tx.metadata?.billing_period || 'monthly',
            package_name: tx.metadata?.package_name || 
              (Array.isArray(tx.package) ? tx.package[0]?.name : tx.package?.name) || 
              'Unknown Package',
            customer_info: tx.metadata?.customer_info,
            gateway_response: tx.gateway_response,
            full_metadata: tx.metadata
          }
        } else {
          return {
            ...baseData,
            billing_period: 'monthly',
            package_name: (Array.isArray(tx.package) ? tx.package[0]?.name : tx.package?.name) || 'Unknown Package'
          }
        }
      })
      .filter((tx): tx is NonNullable<typeof tx> => tx !== null)

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