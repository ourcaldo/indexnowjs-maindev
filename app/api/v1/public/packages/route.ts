import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Fetch all active packages for public display
    const { data: packages, error } = await supabaseAdmin
      .from('indb_payment_packages')
      .select(`
        id,
        name,
        slug,
        description,
        currency,
        billing_period,
        features,
        quota_limits,
        pricing_tiers,
        is_active,
        sort_order,
        free_trial_enabled
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching public packages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch packages' },
        { status: 500 }
      )
    }

    // Format packages for public consumption (remove sensitive data if any)
    const publicPackages = packages?.map(pkg => ({
      ...pkg,
      // Ensure pricing tiers are properly formatted
      pricing_tiers: pkg.pricing_tiers || {},
      // Ensure quota limits are available
      quota_limits: pkg.quota_limits || {}
    })) || []

    return NextResponse.json({
      packages: publicPackages,
      count: publicPackages.length
    })

  } catch (error) {
    console.error('Public packages API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}