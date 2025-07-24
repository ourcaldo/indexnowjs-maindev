import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireServerSuperAdminAuth } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    await requireServerSuperAdminAuth()

    // Fetch dashboard stats from the view
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('admin_dashboard_stats')
      .select('*')
      .single()

    if (statsError) {
      console.error('Error fetching dashboard stats:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch dashboard statistics' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: stats 
    })

  } catch (error: any) {
    console.error('Admin dashboard API error:', error)
    
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}