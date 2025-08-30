import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const packageId = (await params).id

    if (!packageId) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      )
    }

    // Get package details from database
    const { data: packageData, error } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching package:', error)
      return NextResponse.json(
        { error: 'Failed to fetch package details' },
        { status: 500 }
      )
    }

    if (!packageData) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: packageData
    })

  } catch (error) {
    console.error('Package fetch API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}