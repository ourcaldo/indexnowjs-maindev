import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface TrialStatusResponse {
  has_trial: boolean;
  trial_status: 'none' | 'active' | 'ended' | 'converted';
  trial_started_at?: string;
  trial_ends_at?: string;
  days_remaining?: number;
  hours_remaining?: number;
  next_billing_date?: string;
  auto_billing_enabled: boolean;
  trial_package?: any;
  subscription_info?: any;
}

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 })
    }

    // Get user profile with trial information
    const { data: userProfile, error: profileError } = await supabase
      .from('indb_auth_user_profiles')
      .select(`
        trial_status,
        trial_started_at,
        trial_ends_at,
        auto_billing_enabled,
        package_id,
        subscribed_at,
        expires_at
      `)
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({
        success: false,
        message: 'Unable to fetch trial status'
      }, { status: 500 })
    }

    const now = new Date()
    const response: TrialStatusResponse = {
      has_trial: userProfile.trial_status !== 'none',
      trial_status: userProfile.trial_status || 'none',
      auto_billing_enabled: userProfile.auto_billing_enabled || false
    }

    // If user has an active trial, calculate remaining time
    if (userProfile.trial_status === 'active' && userProfile.trial_ends_at) {
      const trialEndTime = new Date(userProfile.trial_ends_at)
      const timeDiff = trialEndTime.getTime() - now.getTime()
      
      response.trial_started_at = userProfile.trial_started_at
      response.trial_ends_at = userProfile.trial_ends_at
      response.days_remaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)))
      response.hours_remaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60)))
    }

    // Get trial package information if available
    if (userProfile.package_id) {
      const { data: packageInfo } = await supabase
        .from('indb_payment_packages')
        .select('*')
        .eq('id', userProfile.package_id)
        .single()

      if (packageInfo) {
        response.trial_package = packageInfo
      }
    }

    // Get subscription information if trial has auto-billing
    if (response.auto_billing_enabled) {
      const { data: subscription } = await supabase
        .from('indb_payment_midtrans')
        .select('next_billing_date, subscription_status, metadata')
        .eq('user_id', user.id)
        .eq('subscription_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (subscription) {
        response.next_billing_date = subscription.next_billing_date
        response.subscription_info = {
          status: subscription.subscription_status,
          metadata: subscription.metadata
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error: any) {
    console.error('Trial status check error:', error)
    return NextResponse.json({
      success: false,
      message: 'Unable to fetch trial status'
    }, { status: 500 })
  }
}