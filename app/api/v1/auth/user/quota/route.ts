import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get today's actual quota usage from the fixed user_quota_summary view
    const { data: quotaData, error: quotaError } = await supabaseAdmin
      .from('user_quota_summary')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (quotaError) {
      console.error('Error fetching quota data:', quotaError)
      return NextResponse.json({ error: 'Failed to fetch quota data' }, { status: 500 })
    }

    // Use real quota data from the corrected view
    const dailyQuotaUsed = quotaData?.total_quota_used || 0  // This now comes from actual usage table
    const dailyQuotaLimit = quotaData?.daily_quota_limit || 50
    const isUnlimited = quotaData?.is_unlimited === true
    const packageName = quotaData?.package_name || 'Free'
    const serviceAccountCount = quotaData?.service_account_count || 0
    
    const remainingQuota = isUnlimited ? -1 : Math.max(0, dailyQuotaLimit - dailyQuotaUsed)
    const quotaExhausted = !isUnlimited && dailyQuotaUsed >= dailyQuotaLimit
    const dailyLimitReached = quotaExhausted

    return NextResponse.json({ 
      quota: {
        daily_quota_used: dailyQuotaUsed, // Real usage from indb_google_quota_usage table
        daily_quota_limit: dailyQuotaLimit,
        is_unlimited: isUnlimited,
        quota_exhausted: quotaExhausted,
        daily_limit_reached: dailyLimitReached,
        package_name: packageName,
        remaining_quota: remainingQuota,
        total_quota_used: dailyQuotaUsed,
        total_quota_limit: quotaData?.total_quota_limit || 0,
        service_account_count: serviceAccountCount
      }
    })
  } catch (error) {
    console.error('Error in GET /api/user/quota:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}