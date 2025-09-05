import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface TrialEligibilityResponse {
  eligible: boolean;
  reason?: 'already_used' | 'existing_subscriber' | 'invalid_account';
  trial_used_at?: string;
  available_packages?: any[];
  message: string;
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
      .select('has_used_trial, trial_used_at, package_id, subscribed_at, expires_at')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({
        eligible: false,
        reason: 'invalid_account',
        message: 'Unable to verify account eligibility'
      } as TrialEligibilityResponse)
    }

    // Check if user has already used trial
    if (userProfile.has_used_trial) {
      return NextResponse.json({
        eligible: false,
        reason: 'already_used',
        trial_used_at: userProfile.trial_used_at,
        message: `Free trial already used on ${new Date(userProfile.trial_used_at).toLocaleDateString()}`
      } as TrialEligibilityResponse)
    }


    // Get available trial packages (based on database configuration)
    const { data: packages, error: packagesError } = await supabase
      .from('indb_payment_packages')
      .select('*')
      .eq('free_trial_enabled', true)
      .eq('is_active', true)
      .order('sort_order')

    if (packagesError) {
      console.error('Error fetching packages:', packagesError)
    }

    // User is eligible for trial
    return NextResponse.json({
      eligible: true,
      available_packages: packages || [],
      message: 'You are eligible for a 3-day free trial'
    } as TrialEligibilityResponse)

  } catch (error: any) {
    console.error('Trial eligibility check error:', error)
    return NextResponse.json({
      eligible: false,
      reason: 'invalid_account',
      message: 'Unable to check trial eligibility'
    } as TrialEligibilityResponse, { status: 500 })
  }
}