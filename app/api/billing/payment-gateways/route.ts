import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Fetch active payment gateways
    const { data: gateways, error } = await supabase
      .from('indb_payment_gateways')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false })

    if (error) {
      console.error('Error fetching payment gateways:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch payment gateways'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      gateways: gateways || []
    })

  } catch (error) {
    console.error('Payment gateways API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}