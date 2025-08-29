import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import jwt from 'jsonwebtoken'
import { getUserCurrency, formatCurrency } from '@/lib/utils/currency-utils'

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

    // Get user profile with package information including pricing_tiers
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select(`
        *,
        package:indb_payment_packages(
          id,
          name,
          slug,
          description,
          currency,
          billing_period,
          features,
          quota_limits,
          is_active,
          pricing_tiers
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

    // Apply currency detection and pricing transformation
    let transformedPackage = profile.package
    
    console.log('=== PROFILE DEBUG START ===')
    console.log('profile.package:', profile.package)
    console.log('profile.country:', profile.country)
    console.log('Raw pricing_tiers:', profile.package?.pricing_tiers)
    console.log('pricing_tiers type:', typeof profile.package?.pricing_tiers)
    
    if (profile.package && profile.country) {
      const userCurrency = getUserCurrency(profile.country)
      const packageData = profile.package
      
      // Parse pricing_tiers if it's a string
      let pricingTiers = packageData.pricing_tiers
      if (typeof pricingTiers === 'string') {
        try {
          pricingTiers = JSON.parse(pricingTiers)
          console.log('Parsed pricing_tiers from string:', pricingTiers)
        } catch (e) {
          console.error('Failed to parse pricing_tiers string:', e)
          pricingTiers = null
        }
      }
      
      // Apply pricing from pricing_tiers based on user currency
      if (pricingTiers && typeof pricingTiers === 'object') {
        const billingPeriod = packageData.billing_period || 'monthly'
        const tierData = pricingTiers[billingPeriod]
        
        console.log('Profile API Debug:')
        console.log('- User Country:', profile.country)
        console.log('- User Currency:', userCurrency)
        console.log('- Billing Period:', billingPeriod)
        console.log('- Tier Data:', tierData)
        
        if (tierData && tierData[userCurrency]) {
          const currencyTierData = tierData[userCurrency]
          const finalPrice = currencyTierData.promo_price || currencyTierData.regular_price
          
          console.log('- Currency Tier Data:', currencyTierData)
          console.log('- Final Price:', finalPrice)
          
          transformedPackage = {
            ...packageData,
            currency: userCurrency,
            price: finalPrice,
            billing_period: billingPeriod,
            // Keep original pricing_tiers for frontend use
            pricing_tiers: pricingTiers
          }
        } else {
          console.log('- No pricing found for currency:', userCurrency)
          // Fallback if no pricing_tiers found
          transformedPackage = {
            ...packageData,
            price: 0 // Default to 0 if no pricing found
          }
        }
      } else {
        console.log('No valid pricing_tiers found')
      }
    } else {
      console.log('Missing package or country data')
    }
    console.log('=== PROFILE DEBUG END ===')
    console.log('Final transformed package:', transformedPackage)

    // Combine profile and auth data with additional stats
    const userProfile = {
      ...profile,
      package: transformedPackage,
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