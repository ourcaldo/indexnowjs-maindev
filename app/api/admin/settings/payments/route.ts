import { NextRequest, NextResponse } from 'next/server'
import { requireServerSuperAdminAuth } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    await requireServerSuperAdminAuth(request)

    const { data: gateways, error } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch payment gateways:', error)
      return NextResponse.json({ error: 'Failed to fetch payment gateways' }, { status: 500 })
    }

    return NextResponse.json({ gateways: gateways || [] })
  } catch (error) {
    console.error('Payment gateways API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireServerSuperAdminAuth(request)
    const body = await request.json()

    // If setting as default, remove default from other gateways
    if (body.is_default) {
      await supabaseAdmin
        .from('indb_payment_gateways')
        .update({ is_default: false })
        .neq('id', 'placeholder')
    }

    const { data: gateway, error } = await supabaseAdmin
      .from('indb_payment_gateways')
      .insert({
        name: body.name,
        slug: body.slug,
        description: body.description,
        is_active: body.is_active || false,
        is_default: body.is_default || false,
        configuration: body.configuration || {},
        api_credentials: body.api_credentials || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create payment gateway:', error)
      return NextResponse.json({ error: 'Failed to create payment gateway' }, { status: 500 })
    }

    return NextResponse.json({ gateway })
  } catch (error) {
    console.error('Payment gateways create API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}