import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { QuotaService } from '@/lib/quota-service'

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

    // Set the auth token
    await supabase.auth.setSession({ access_token: token, refresh_token: '' })
    
    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's quota information
    const quotaInfo = await QuotaService.getUserQuota(user.id)
    
    if (!quotaInfo) {
      return NextResponse.json({ error: 'Failed to fetch quota information' }, { status: 500 })
    }

    return NextResponse.json({ 
      quota: {
        daily_quota_used: quotaInfo.daily_quota_used,
        daily_quota_limit: quotaInfo.daily_quota_limit,
        is_unlimited: quotaInfo.is_unlimited,
        quota_exhausted: quotaInfo.quota_exhausted,
        package_name: quotaInfo.package_name,
        remaining_quota: quotaInfo.is_unlimited ? -1 : quotaInfo.daily_quota_limit - quotaInfo.daily_quota_used
      }
    })
  } catch (error) {
    console.error('Error in GET /api/user/quota:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}