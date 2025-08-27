import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Get all active packages for public display (no auth required)
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

    // Transform packages data for public display
    const transformedPackages = packages?.map(pkg => {
      // Parse pricing_tiers if it's a JSON string
      let pricingTiers = {}
      try {
        if (typeof pkg.pricing_tiers === 'string') {
          pricingTiers = JSON.parse(pkg.pricing_tiers)
        } else if (typeof pkg.pricing_tiers === 'object' && pkg.pricing_tiers !== null) {
          pricingTiers = pkg.pricing_tiers
        }
      } catch (error) {
        console.error('Failed to parse pricing_tiers for package:', pkg.id, error)
        pricingTiers = {}
      }

      return {
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
        pricing_tiers: pricingTiers
      }
    }) || []

    return NextResponse.json({
      success: true,
      packages: transformedPackages
    })

  } catch (error: any) {
    console.error('Public packages API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}