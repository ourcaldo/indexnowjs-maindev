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

    // Get user profile with package information (direct and accurate)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select(`
        user_id,
        daily_quota_used,
        daily_quota_reset_date,
        package:indb_payment_packages(
          id,
          name,
          quota_limits
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // Get service account count
    const { count: serviceAccountCount } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    const packageData = Array.isArray(profileData.package) ? profileData.package[0] : profileData.package
    
    // Reset quota if it's a new day
    const today = new Date().toISOString().split('T')[0]
    let dailyQuotaUsed = profileData.daily_quota_used || 0
    
    if (profileData.daily_quota_reset_date !== today) {
      // Reset quota for new day
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

    // Use accurate daily quota tracking from user profile
    const dailyQuotaLimit = packageData?.quota_limits?.daily_urls || 50
    const isUnlimited = dailyQuotaLimit === -1
    const packageName = packageData?.name || 'Free'
    
    const remainingQuota = isUnlimited ? -1 : Math.max(0, dailyQuotaLimit - dailyQuotaUsed)
    const quotaExhausted = !isUnlimited && dailyQuotaUsed >= dailyQuotaLimit
    const dailyLimitReached = quotaExhausted

    return NextResponse.json({ 
      quota: {
        daily_quota_used: dailyQuotaUsed, // Accurate daily usage from profile
        daily_quota_limit: dailyQuotaLimit, // Package daily limit
        is_unlimited: isUnlimited,
        quota_exhausted: quotaExhausted,
        daily_limit_reached: dailyLimitReached,
        package_name: packageName,
        remaining_quota: remainingQuota,
        total_quota_used: dailyQuotaUsed, // Same as daily for compatibility
        total_quota_limit: (serviceAccountCount || 0) * 200,
        service_account_count: serviceAccountCount || 0
      }
    })
  } catch (error) {
    console.error('Error in GET /api/user/quota:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}