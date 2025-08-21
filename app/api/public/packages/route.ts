import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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
      pricing_tiers: Array.isArray(pkg.pricing_tiers) ? pkg.pricing_tiers : []
    })) || []

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