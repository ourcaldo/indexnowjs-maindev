import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { getUserCurrency, formatCurrency } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get all active packages
    const { data: packages, error: packagesError } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (packagesError) {
      console.error('Error fetching packages:', packagesError)
      return NextResponse.json(
        { error: 'Failed to fetch packages' },
        { status: 500 }
      )
    }

    // Get user's current package and country information
    const { data: userProfile } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('package_id, expires_at, country')
      .eq('user_id', user.id)
      .single()

    // Determine user's currency based on country
    const userCountry = userProfile?.country
    const userCurrency = getUserCurrency(userCountry)
    
    // Transform packages data with currency-specific pricing
    const transformedPackages = packages?.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug,
      description: pkg.description,
      // Note: price now comes from pricing_tiers, this field is kept for backward compatibility
      price: 0, // Deprecated - use pricing_tiers instead
      currency: userCurrency,
      billing_period: pkg.billing_period,
      features: pkg.features || [],
      quota_limits: pkg.quota_limits || {},
      is_popular: pkg.is_popular || false,
      is_current: pkg.id === userProfile?.package_id,
      pricing_tiers: pkg.pricing_tiers || {},
      user_currency: userCurrency,
      user_country: userCountry
    })) || []

    return NextResponse.json({
      packages: transformedPackages,
      current_package_id: userProfile?.package_id,
      expires_at: userProfile?.expires_at,
      user_currency: userCurrency,
      user_country: userCountry
    })

  } catch (error: any) {
    console.error('Billing packages API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}