import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'
import { ActivityLogger } from '@/lib/monitoring'

// GET /api/v1/admin/users/[id] - Get individual user details
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

    // Get user profile from our custom table with package information
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select(`
        *,
        package:indb_payment_packages(
          id,
          name,
          slug,
          description,
          price,
          currency,
          billing_period,
          features,
          quota_limits,
          is_active
        )
      `)
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user auth data from Supabase auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (authError) {
      console.error('Auth user fetch error:', authError)
    }

    // Get additional user statistics
    const [serviceAccountsResult, activeJobsResult] = await Promise.all([
      supabaseAdmin
        .from('indb_google_service_accounts')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_active', true),
      supabaseAdmin
        .from('indb_indexing_jobs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .in('status', ['running', 'pending'])
    ])

    // Combine profile and auth data with additional stats
    const userWithAuthData = {
      ...profile,
      auth_data: {
        id: authUser?.user?.id,
        email: authUser?.user?.email,
        email_confirmed_at: authUser?.user?.email_confirmed_at,
        phone: authUser?.user?.phone,
        created_at: authUser?.user?.created_at,
        updated_at: authUser?.user?.updated_at,
        last_sign_in_at: authUser?.user?.last_sign_in_at,
        app_metadata: authUser?.user?.app_metadata,
        user_metadata: authUser?.user?.user_metadata,
      },
      stats: {
        service_accounts_count: serviceAccountsResult.count || 0,
        active_jobs_count: activeJobsResult.count || 0
      }
    }

    return NextResponse.json({
      success: true,
      user: userWithAuthData
    })

  } catch (error: any) {
    console.error('Admin get user API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/v1/admin/users/[id] - Update user profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireSuperAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const { id: userId } = await params
    const body = await request.json()

    // Update user profile
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      )
    }

    // Log admin activity
    try {
      await ActivityLogger.logAdminDashboardActivity(
        adminUser.id,
        'admin_user_update',
        `Updated user profile for ${body.email}`,
        request,
        {
          targetUserId: userId,
          updatedFields: Object.keys(body),
          adminEmail: adminUser.email
        }
      )
    } catch (logError) {
      console.error('Failed to log admin activity:', logError)
    }

    return NextResponse.json({
      success: true,
      user: updatedProfile
    })

  } catch (error: any) {
    console.error('Admin update user API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}