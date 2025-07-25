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

    // Get real-time quota data directly from user_quota_summary view
    const { data: quotaSummary, error: quotaError } = await supabaseAdmin
      .from('user_quota_summary')
      .select('total_quota_used, total_quota_limit')
      .eq('user_id', user.id)
      .single()

    // Get user profile for package info and daily quota tracking
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select(`
        daily_quota_used,
        daily_quota_reset_date,
        package_id,
        indb_payment_packages!inner(name, quota_limits)
      `)
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    const packageData = Array.isArray(profile.indb_payment_packages) ? profile.indb_payment_packages[0] : profile.indb_payment_packages
    const dailyLimit = packageData?.quota_limits?.daily_urls || 0
    const isUnlimited = dailyLimit === -1
    const packageName = packageData?.name || 'Free'

    // Get current daily quota used (with daily reset logic)
    const today = new Date().toISOString().split('T')[0]
    const resetDate = profile.daily_quota_reset_date
    let dailyQuotaUsed = profile.daily_quota_used || 0

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
      
      dailyQuotaUsed = 0
    }

    const remainingQuota = isUnlimited ? -1 : Math.max(0, dailyLimit - dailyQuotaUsed)
    const quotaExhausted = !isUnlimited && remainingQuota <= 0
    const dailyLimitReached = !isUnlimited && dailyQuotaUsed >= dailyLimit

    // Use total_quota_used from user_quota_summary view but keep package daily limit
    const displayQuotaUsed = quotaSummary?.total_quota_used || 0
    const displayQuotaLimit = dailyLimit // Use package daily limit (50), not total quota limit
    
    // Recalculate based on actual usage from database and package limits
    const actualRemainingQuota = isUnlimited ? -1 : Math.max(0, displayQuotaLimit - displayQuotaUsed)
    const actualQuotaExhausted = !isUnlimited && actualRemainingQuota <= 0
    const actualDailyLimitReached = !isUnlimited && displayQuotaUsed >= displayQuotaLimit

    return NextResponse.json({ 
      quota: {
        daily_quota_used: displayQuotaUsed, // Show actual usage (200)
        daily_quota_limit: displayQuotaLimit, // Show package limit (50)
        is_unlimited: isUnlimited,
        quota_exhausted: actualQuotaExhausted,
        daily_limit_reached: actualDailyLimitReached,
        package_name: packageName,
        remaining_quota: actualRemainingQuota,
        total_quota_used: quotaSummary?.total_quota_used || 0,
        total_quota_limit: quotaSummary?.total_quota_limit || 0
      }
    })
  } catch (error) {
    console.error('Error in GET /api/user/quota:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}