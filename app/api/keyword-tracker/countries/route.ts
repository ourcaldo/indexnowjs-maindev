import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin

    // Get all active countries
    const { data: countries, error } = await supabase
      .from('indb_keyword_countries')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching countries:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch countries' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: countries || []
    })

  } catch (error) {
    console.error('Countries API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}