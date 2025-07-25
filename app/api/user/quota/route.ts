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

    // Get ALL quota data from the updated user_quota_summary view
    const { data: quotaData, error: quotaError } = await supabaseAdmin
      .from('user_quota_summary')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (quotaError) {
      console.error('Error fetching quota data:', quotaError)
      return NextResponse.json({ error: 'Failed to fetch quota data' }, { status: 500 })
    }

    // Extract all data from the view
    const totalQuotaUsed = quotaData?.total_quota_used || 0
    const dailyQuotaLimit = quotaData?.daily_quota_limit || 50
    const isUnlimited = quotaData?.is_unlimited || false
    const packageName = quotaData?.package_name || 'Free'
    const dailyQuotaUsed = quotaData?.daily_quota_used || 0

    // Handle daily reset logic
    const today = new Date().toISOString().split('T')[0]
    const resetDate = quotaData?.daily_quota_reset_date
    let actualDailyUsed = dailyQuotaUsed

    // Reset quota if it's a new day
    if (resetDate !== today) {
      await supabaseAdmin
        .from('indb_auth_user_profiles')
        .update({
          daily_quota_used: 0,
          daily_quota_reset_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
      
      actualDailyUsed = 0
    }

    // Calculate quota status based on package limits
    const remainingQuota = isUnlimited ? -1 : Math.max(0, dailyQuotaLimit - actualDailyUsed)
    const quotaExhausted = !isUnlimited && remainingQuota <= 0
    const dailyLimitReached = !isUnlimited && actualDailyUsed >= dailyQuotaLimit

    return NextResponse.json({ 
      quota: {
        daily_quota_used: actualDailyUsed, // Show daily usage from profile
        daily_quota_limit: dailyQuotaLimit, // Show package daily limit (50)
        is_unlimited: isUnlimited,
        quota_exhausted: quotaExhausted,
        daily_limit_reached: dailyLimitReached,
        package_name: packageName,
        remaining_quota: remainingQuota,
        total_quota_used: totalQuotaUsed, // Show total service account usage
        total_quota_limit: quotaData?.total_quota_limit || 0,
        service_account_count: quotaData?.service_account_count || 0
      }
    })
  } catch (error) {
    console.error('Error in GET /api/user/quota:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}