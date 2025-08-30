import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get Midtrans payment gateway configuration from database
    const { data: midtransGateway, error: gatewayError } = await supabase
      .from('indb_payment_gateways')
      .select('configuration, api_credentials')
      .eq('slug', 'midtrans')
      .eq('is_active', true)
      .single()

    if (gatewayError || !midtransGateway) {
      return NextResponse.json(
        { success: false, message: 'Midtrans payment gateway not configured' },
        { status: 500 }
      )
    }

    const { client_key } = midtransGateway.api_credentials
    const { environment } = midtransGateway.configuration

    if (!client_key) {
      return NextResponse.json(
        { success: false, message: 'Midtrans client key not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        client_key,
        environment
      }
    })
    
  } catch (error) {
    console.error('Error fetching Midtrans config:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}