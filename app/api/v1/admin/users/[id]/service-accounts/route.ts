import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

// GET /api/v1/admin/users/[id]/service-accounts - Get user's service accounts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require super admin authentication
    const adminUser = await requireSuperAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const { id: userId } = await params

    // Get user's service accounts
    const { data: serviceAccounts, error } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select(`
        id,
        name,
        email,
        is_active,
        daily_quota_limit,
        minute_quota_limit,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching service accounts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch service accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      serviceAccounts: serviceAccounts || [] 
    })

  } catch (error: any) {
    console.error('Service accounts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}