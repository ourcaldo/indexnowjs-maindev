import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

// GET /api/v1/billing/packages - Fetch all active packages
export async function GET(request: NextRequest) {
  try {
    // Fetch all active packages ordered by price
    const { data: packages, error } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) {
      console.error('Error fetching packages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch packages' },
        { status: 500 }
      )
    }

    // Process packages to ensure proper structure
    const processedPackages = packages.map(pkg => ({
      ...pkg,
      features: Array.isArray(pkg.features) ? pkg.features : [],
      quota_limits: typeof pkg.quota_limits === 'object' ? pkg.quota_limits : {}
    }))

    return NextResponse.json({
      success: true,
      packages: processedPackages
    })

  } catch (error: any) {
    console.error('Packages API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}