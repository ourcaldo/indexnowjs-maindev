import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
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

    // Get user profile with package information
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select(`
        *,
        package:indb_payment_packages(
          id,
          name,
          slug,
          description,
          price,
          currency,
          billing_period,
          features,
          quota_limits,
          is_active
        )
      `)
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get user auth data from Supabase auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (authError) {
      console.error('Auth user fetch error:', authError)
    }

    // Get additional user statistics
    const [serviceAccountsResult, activeJobsResult] = await Promise.all([
      supabaseAdmin
        .from('indb_google_service_accounts')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_active', true),
      supabaseAdmin
        .from('indb_indexing_jobs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .in('status', ['running', 'pending'])
    ])

    // Combine profile and auth data with additional stats
    const userProfile = {
      ...profile,
      email: authUser.user?.email || null,
      email_confirmed_at: authUser.user?.email_confirmed_at || null,
      last_sign_in_at: authUser.user?.last_sign_in_at || null,
      service_account_count: serviceAccountsResult.count || 0,
      active_jobs_count: activeJobsResult.count || 0,
    }

    return NextResponse.json({ 
      success: true, 
      profile: userProfile 
    })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}