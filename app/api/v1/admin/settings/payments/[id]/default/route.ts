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

    // Remove default from all gateways first
    await supabaseAdmin
      .from('indb_payment_gateways')
      .update({ is_default: false })
      .neq('id', 'placeholder')

    // Set this gateway as default
    const { data: gateway, error } = await supabaseAdmin
      .from('indb_payment_gateways')
      .update({ 
        is_default: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to set default payment gateway:', error)
      return NextResponse.json({ error: 'Failed to set default payment gateway' }, { status: 500 })
    }

    return NextResponse.json({ gateway })
  } catch (error) {
    console.error('Payment gateway default API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}