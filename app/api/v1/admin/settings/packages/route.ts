import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdminAuth(request)

    const { data: packages, error } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch packages:', error)
      return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
    }

    return NextResponse.json({ packages: packages || [] })
  } catch (error) {
    console.error('Packages API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdminAuth(request)
    const body = await request.json()

    const { data: package_data, error } = await supabaseAdmin
      .from('indb_payment_packages')
      .insert({
        name: body.name,
        slug: body.slug,
        description: body.description,
        price: body.price || 0,
        currency: body.currency || 'IDR',
        billing_period: body.billing_period || 'monthly',
        features: body.features || [],
        quota_limits: body.quota_limits || {},
        is_active: body.is_active || false,
        sort_order: body.sort_order || 0,
        pricing_tiers: body.pricing_tiers || []
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create package:', error)
      return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
    }

    return NextResponse.json({ package: package_data })
  } catch (error) {
    console.error('Packages create API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}