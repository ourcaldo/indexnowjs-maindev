import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

// GET /api/v1/admin/users/[id]/quota-usage - Get user's quota usage
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

    // Get user's service accounts first
    const { data: serviceAccounts } = await supabaseAdmin
      .from('indb_google_service_accounts')
      .select('id')
      .eq('user_id', userId)

    if (!serviceAccounts || serviceAccounts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        usage: [] 
      })
    }

    const serviceAccountIds = serviceAccounts.map(acc => acc.id)

    // Get quota usage for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: quotaUsage, error } = await supabaseAdmin
      .from('indb_google_quota_usage')
      .select(`
        id,
        service_account_id,
        date,
        requests_made,
        requests_successful,
        requests_failed,
        last_request_at
      `)
      .in('service_account_id', serviceAccountIds)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching quota usage:', error)
      return NextResponse.json(
        { error: 'Failed to fetch quota usage' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      usage: quotaUsage || [] 
    })

  } catch (error: any) {
    console.error('Quota usage API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}