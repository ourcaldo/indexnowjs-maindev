import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

    // Get user's current package
    const { data: userProfile } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('package_id, expires_at')
      .eq('user_id', user.id)
      .single()

    // Transform packages data
    const transformedPackages = packages?.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug,
      description: pkg.description,
      price: parseFloat(pkg.price || '0'),
      currency: pkg.currency,
      billing_period: pkg.billing_period,
      features: pkg.features || [],
      quota_limits: pkg.quota_limits || {},
      is_popular: pkg.is_popular || false,
      is_current: pkg.id === userProfile?.package_id,
      pricing_tiers: pkg.pricing_tiers || {}
    })) || []

    return NextResponse.json({
      packages: transformedPackages,
      current_package_id: userProfile?.package_id,
      expires_at: userProfile?.expires_at
    })

  } catch (error: any) {
    console.error('Billing packages API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}