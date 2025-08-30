import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createMidtransService } from '@/lib/payment-services/midtrans-service'

export async function POST(request: NextRequest) {
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

    // Get user's current trial status
    const { data: userProfile, error: profileError } = await supabase
      .from('indb_auth_user_profiles')
      .select('trial_status, trial_ends_at, auto_billing_enabled, package_id')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({
        success: false,
        message: 'Unable to fetch trial information'
      }, { status: 500 })
    }

    if (userProfile.trial_status !== 'active') {
      return NextResponse.json({
        success: false,
        message: 'No active trial found'
      }, { status: 400 })
    }

    // Get the active Midtrans subscription for this user
    const { data: subscription, error: subError } = await supabase
      .from('indb_payment_midtrans')
      .select('midtrans_subscription_id, subscription_status')
      .eq('user_id', user.id)
      .eq('subscription_status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError && subError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching subscription:', subError)
      return NextResponse.json({
        success: false,
        message: 'Unable to fetch subscription information'
      }, { status: 500 })
    }

    // Cancel Midtrans subscription if it exists
    if (subscription?.midtrans_subscription_id) {
      try {
        // Get Midtrans configuration
        const { data: gateway, error: gatewayError } = await supabase
          .from('indb_payment_gateways')
          .select('api_credentials, configuration')
          .eq('slug', 'midtrans')
          .eq('is_active', true)
          .single()

        if (!gatewayError && gateway) {
          const midtransService = createMidtransService({
            server_key: gateway.api_credentials.server_key,
            client_key: gateway.api_credentials.client_key,
            environment: gateway.configuration.environment,
            merchant_id: gateway.api_credentials.merchant_id
          })

          // Cancel the subscription
          await midtransService.cancelSubscription(subscription.midtrans_subscription_id)
          console.log('✅ [Trial Cancellation] Midtrans subscription cancelled:', subscription.midtrans_subscription_id)

          // Update subscription status in database
          await supabase
            .from('indb_payment_midtrans')
            .update({ subscription_status: 'cancelled' })
            .eq('midtrans_subscription_id', subscription.midtrans_subscription_id)
        }
      } catch (midtransError) {
        console.error('Error cancelling Midtrans subscription:', midtransError)
        // Continue with local cancellation even if Midtrans fails
      }
    }

    // Update user profile to cancel trial
    const { error: updateError } = await supabase
      .from('indb_auth_user_profiles')
      .update({
        trial_status: 'cancelled',
        auto_billing_enabled: false,
        package_id: null, // Remove package assignment
        subscribed_at: null,
        expires_at: null
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      return NextResponse.json({
        success: false,
        message: 'Failed to cancel trial'
      }, { status: 500 })
    }

    console.log('✅ [Trial Cancellation] User trial cancelled successfully for user:', user.id)

    return NextResponse.json({
      success: true,
      message: 'Trial cancelled successfully'
    })

  } catch (error: any) {
    console.error('Trial cancellation error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to cancel trial'
    }, { status: 500 })
  }
}