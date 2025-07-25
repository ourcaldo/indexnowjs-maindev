import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdminAuth(request)
    const { id } = await params
    const body = await request.json()

    const { data: packageData, error } = await supabaseAdmin
      .from('indb_payment_packages')
      .update({
        name: body.name,
        slug: body.slug,
        description: body.description,
        price: body.price,
        currency: body.currency,
        billing_period: body.billing_period,
        features: body.features || [],
        quota_limits: body.quota_limits || {},
        is_active: body.is_active,
        is_popular: body.is_popular,
        sort_order: body.sort_order,
        pricing_tiers: body.pricing_tiers || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update package:', error)
      return NextResponse.json({ error: 'Failed to update package' }, { status: 500 })
    }

    return NextResponse.json({ package: packageData })
  } catch (error) {
    console.error('Package update API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdminAuth(request)
    const { id } = await params

    const { error } = await supabaseAdmin
      .from('indb_payment_packages')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete package:', error)
      return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Package delete API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}