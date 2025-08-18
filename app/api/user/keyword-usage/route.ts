import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify JWT token to get user ID
    const payload = jwt.decode(token) as any
    if (!payload || !payload.sub) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = payload.sub

    // Get current month's start and end dates
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // Fetch current keyword usage for this month
    const { data: keywordUsage, error: usageError } = await supabaseAdmin
      .from('indb_keyword_usage')
      .select('keywords_used, keywords_limit, period_start, period_end')
      .eq('user_id', userId)
      .gte('period_start', currentMonthStart.toISOString())
      .lt('period_start', nextMonthStart.toISOString())
      .order('period_start', { ascending: false })
      .limit(1)
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error fetching keyword usage:', usageError)
      return NextResponse.json(
        { error: 'Failed to fetch keyword usage data' },
        { status: 500 }
      )
    }

    // If no usage record found, return 0 usage
    if (!keywordUsage) {
      // Get user's package to determine keyword limit
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select(`
          package:indb_payment_packages(
            quota_limits
          )
        `)
        .eq('user_id', userId)
        .single()

      const keywordsLimit = profile?.package?.[0]?.quota_limits?.keywords_limit || 0

      return NextResponse.json({
        keywords_used: 0,
        keywords_limit: keywordsLimit,
        is_unlimited: keywordsLimit === -1,
        remaining_quota: keywordsLimit === -1 ? -1 : keywordsLimit,
        period_start: currentMonthStart.toISOString(),
        period_end: new Date(nextMonthStart.getTime() - 1).toISOString()
      })
    }

    const keywordsUsed = keywordUsage.keywords_used || 0
    const keywordsLimit = keywordUsage.keywords_limit || 0
    const isUnlimited = keywordsLimit === -1
    const remainingQuota = isUnlimited ? -1 : Math.max(0, keywordsLimit - keywordsUsed)

    return NextResponse.json({
      keywords_used: keywordsUsed,
      keywords_limit: keywordsLimit,
      is_unlimited: isUnlimited,
      remaining_quota: remainingQuota,
      period_start: keywordUsage.period_start,
      period_end: keywordUsage.period_end
    })

  } catch (error) {
    console.error('Error in keyword usage API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}