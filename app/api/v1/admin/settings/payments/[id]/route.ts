import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdminAuth(request)
    const { id } = await params
    const body = await request.json()

    // If setting as default, remove default from other gateways
    if (body.is_default) {
      await supabaseAdmin
        .from('indb_payment_gateways')
        .update({ is_default: false })
        .neq('id', id)
    }

    const { data: gateway, error } = await supabaseAdmin
      .from('indb_payment_gateways')
      .update({
        name: body.name,
        slug: body.slug,
        description: body.description,
        is_active: body.is_active,
        is_default: body.is_default,
        configuration: body.configuration || {},
        api_credentials: body.api_credentials || {},
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update payment gateway:', error)
      return NextResponse.json({ error: 'Failed to update payment gateway' }, { status: 500 })
    }

    return NextResponse.json({ gateway })
  } catch (error) {
    console.error('Payment gateway update API error:', error)
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
      .from('indb_payment_gateways')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete payment gateway:', error)
      return NextResponse.json({ error: 'Failed to delete payment gateway' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment gateway delete API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}