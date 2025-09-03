import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import { getUserCurrency } from '@/lib/utils/currency-utils'

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

    // Create client with the user's token for some queries
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get the user to verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Execute all queries in parallel for better performance
    const [
      userProfileResult,
      keywordUsageResult,
      quotaDataResult,
      userSettingsResult,
      trialEligibilityResult,
      packagesResult,
      domainsResult,
      serviceAccountQuotaResult,
      recentKeywordsResult
    ] = await Promise.all([
      // User Profile
      supabaseAdmin
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
        .single(),

      // Keyword Usage
      supabaseAdmin
        .from('indb_keyword_usage')
        .select('keywords_used, keywords_limit, period_start, period_end')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Quota Data
      supabaseAdmin
        .from('user_quota_summary')
        .select('*')
        .eq('user_id', userId)
        .single(),

      // User Settings
      supabaseAdmin
        .from('indb_auth_user_settings')
        .select('*')
        .eq('user_id', userId)
        .single(),

      // Trial Eligibility - check if user has used trial
      supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('has_used_trial, trial_used_at, package_id, subscribed_at, expires_at')
        .eq('user_id', userId)
        .single(),

      // Billing Packages
      supabaseAdmin
        .from('indb_payment_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),

      // Domains
      supabaseAdmin
        .from('indb_keyword_domains')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),

      // Service Account Quota Notifications
      supabaseAdmin
        .from('indb_notifications_dashboard')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'quota_warning')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10),

      // Recent Keywords for Dashboard Overview
      supabaseAdmin
        .from('indb_keyword_keywords')
        .select(`
          id,
          keyword,
          device_type,
          domain:indb_keyword_domains(
            id,
            domain_name,
            display_name
          ),
          country:indb_keyword_countries(
            name,
            iso2_code
          ),
          recent_ranking:indb_keyword_rankings(
            position,
            check_date
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50) // Get top 50 keywords for dashboard overview
    ])

    // Get additional user statistics
    const [serviceAccountsResult, activeJobsResult, authUserResult] = await Promise.all([
      supabaseAdmin
        .from('indb_google_service_accounts')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_active', true),
      supabaseAdmin
        .from('indb_indexing_jobs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .in('status', ['running', 'pending']),
      supabaseAdmin.auth.admin.getUserById(userId)
    ])

    // Process User Profile
    let profile = null
    if (!userProfileResult.error && userProfileResult.data) {
      let transformedPackage = userProfileResult.data.package
      
      if (userProfileResult.data.package) {
        // Default to USD if no country data available
        const userCurrency = userProfileResult.data.country ? getUserCurrency(userProfileResult.data.country) : 'USD'
        const packageData = userProfileResult.data.package
        
        // Parse pricing_tiers if it's a string
        let pricingTiers = packageData.pricing_tiers
        if (typeof pricingTiers === 'string') {
          try {
            pricingTiers = JSON.parse(pricingTiers)
          } catch (e) {
            pricingTiers = null
          }
        }
        
        // Apply pricing from pricing_tiers based on user currency
        if (pricingTiers && typeof pricingTiers === 'object') {
          const billingPeriod = packageData.billing_period || 'monthly'
          const tierData = pricingTiers[billingPeriod]
          
          if (tierData && tierData[userCurrency]) {
            const currencyTierData = tierData[userCurrency]
            const finalPrice = currencyTierData.promo_price || currencyTierData.regular_price
            
            transformedPackage = {
              ...packageData,
              currency: userCurrency,
              price: finalPrice,
              billing_period: billingPeriod,
              pricing_tiers: pricingTiers
            }
          } else {
            transformedPackage = {
              ...packageData,
              price: 0
            }
          }
        }
      }

      profile = {
        ...userProfileResult.data,
        package: transformedPackage,
        email: authUserResult.data.user?.email || null,
        email_confirmed_at: authUserResult.data.user?.email_confirmed_at || null,
        last_sign_in_at: authUserResult.data.user?.last_sign_in_at || null,
        service_account_count: serviceAccountsResult.count || 0,
        active_jobs_count: activeJobsResult.count || 0,
      }
    }

    // Process Keyword Usage
    let keywordUsage = null
    if (keywordUsageResult.error && keywordUsageResult.error.code === 'PGRST116') {
      // No usage record found, get limit from user's package
      const keywordsLimit = (profile?.package as any)?.quota_limits?.keywords_limit || 0
      keywordUsage = {
        keywords_used: 0,
        keywords_limit: keywordsLimit,
        is_unlimited: keywordsLimit === -1,
        remaining_quota: keywordsLimit === -1 ? -1 : keywordsLimit,
        period_start: null,
        period_end: null
      }
    } else if (!keywordUsageResult.error && keywordUsageResult.data) {
      const keywordsUsed = keywordUsageResult.data.keywords_used || 0
      const keywordsLimit = (profile?.package as any)?.quota_limits?.keywords_limit || 0
      const isUnlimited = keywordsLimit === -1
      const remainingQuota = isUnlimited ? -1 : Math.max(0, keywordsLimit - keywordsUsed)

      keywordUsage = {
        keywords_used: keywordsUsed,
        keywords_limit: keywordsLimit,
        is_unlimited: isUnlimited,
        remaining_quota: remainingQuota,
        period_start: keywordUsageResult.data.period_start,
        period_end: keywordUsageResult.data.period_end
      }
    }

    // Process Quota Data
    let quota = null
    if (!quotaDataResult.error && quotaDataResult.data) {
      const dailyQuotaUsed = quotaDataResult.data.total_quota_used || 0
      const dailyQuotaLimit = quotaDataResult.data.daily_quota_limit || 50
      const isUnlimited = quotaDataResult.data.is_unlimited === true
      const remainingQuota = isUnlimited ? -1 : Math.max(0, dailyQuotaLimit - dailyQuotaUsed)
      const quotaExhausted = !isUnlimited && dailyQuotaUsed >= dailyQuotaLimit

      quota = {
        daily_quota_used: dailyQuotaUsed,
        daily_quota_limit: dailyQuotaLimit,
        is_unlimited: isUnlimited,
        quota_exhausted: quotaExhausted,
        daily_limit_reached: quotaExhausted,
        package_name: quotaDataResult.data.package_name || 'Free',
        remaining_quota: remainingQuota,
        total_quota_used: dailyQuotaUsed,
        total_quota_limit: quotaDataResult.data.total_quota_limit || 0,
        service_account_count: quotaDataResult.data.service_account_count || 0
      }
    }

    // Process User Settings
    let settings = null
    if (userSettingsResult.error && userSettingsResult.error.code === 'PGRST116') {
      // Create default settings if none exist
      const { data: newSettings } = await supabaseAdmin
        .from('indb_auth_user_settings')
        .insert({
          user_id: userId,
          timeout_duration: 30000,
          retry_attempts: 3,
          email_job_completion: true,
          email_job_failure: true,
          email_quota_alerts: true,
          default_schedule: 'one-time',
          email_daily_report: true,
        })
        .select()
        .single()
      settings = newSettings
    } else if (!userSettingsResult.error) {
      settings = userSettingsResult.data
    }

    // Process Trial Eligibility
    let trialEligibility = null
    if (!trialEligibilityResult.error && trialEligibilityResult.data) {
      const trialData = trialEligibilityResult.data
      if (trialData.has_used_trial) {
        trialEligibility = {
          eligible: false,
          reason: 'already_used',
          trial_used_at: trialData.trial_used_at,
          message: `Free trial already used on ${new Date(trialData.trial_used_at).toLocaleDateString()}`
        }
      } else {
        // Get available trial packages
        const { data: trialPackages } = await supabaseAdmin
          .from('indb_payment_packages')
          .select('*')
          .in('slug', ['premium', 'pro'])
          .eq('is_active', true)
          .order('sort_order')

        trialEligibility = {
          eligible: true,
          available_packages: trialPackages || [],
          message: 'You are eligible for a 3-day free trial'
        }
      }
    }

    // Process Billing Packages
    let billingPackages = null
    if (!packagesResult.error && packagesResult.data) {
      const userCountry = profile?.country
      const userCurrency = getUserCurrency(userCountry)
      
      billingPackages = {
        packages: packagesResult.data.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          slug: pkg.slug,
          description: pkg.description,
          price: 0, // Deprecated - use pricing_tiers instead
          currency: userCurrency,
          billing_period: pkg.billing_period,
          features: pkg.features || [],
          quota_limits: pkg.quota_limits || {},
          is_popular: pkg.is_popular || false,
          is_current: pkg.id === profile?.package_id,
          pricing_tiers: pkg.pricing_tiers || {},
          user_currency: userCurrency,
          user_country: userCountry
        })),
        current_package_id: profile?.package_id,
        expires_at: profile?.expires_at,
        user_currency: userCurrency,
        user_country: userCountry
      }
    }

    // Process Recent Keywords for Dashboard
    let recentKeywords: any[] = []
    if (!recentKeywordsResult.error && recentKeywordsResult.data) {
      recentKeywords = recentKeywordsResult.data
    }

    // Build the merged response
    const dashboardData = {
      user: {
        profile: profile,
        quota: quota,
        settings: settings,
        trial: trialEligibility
      },
      billing: billingPackages,
      indexing: {
        serviceAccounts: serviceAccountsResult.count || 0
      },
      rankTracking: {
        usage: keywordUsage,
        domains: domainsResult.data || [],
        recentKeywords: recentKeywords
      },
      notifications: serviceAccountQuotaResult.data || []
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Error in dashboard merged API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}