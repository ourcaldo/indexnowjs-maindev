import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdminAuth } from '@/lib/admin-auth'
import { ActivityLogger } from '@/lib/activity-logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const adminUser = await requireSuperAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const { id: userId } = await params

    // Get current user data
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('full_name, daily_quota_used, package:indb_payment_packages(name)')
      .eq('user_id', userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Reset daily quota usage to 0
    const { error: updateError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        daily_quota_used: 0,
        daily_quota_reset_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error resetting quota:', updateError)
      return NextResponse.json(
        { error: 'Failed to reset quota' },
        { status: 500 }
      )
    }

    // Log admin activity
    try {
      await ActivityLogger.logAdminAction(
        adminUser.id,
        'quota_reset',
        userId,
        `Reset daily quota for ${currentUser.full_name || 'User'} (was ${currentUser.daily_quota_used || 0})`,
        request,
        { 
          quotaReset: true,
          previousQuotaUsed: currentUser.daily_quota_used || 0,
          userFullName: currentUser.full_name 
        }
      )
    } catch (logError) {
      console.error('Failed to log quota reset activity:', logError)
    }

    return NextResponse.json({ 
      success: true,
      message: `Daily quota successfully reset to 0`,
      previous_quota_used: currentUser.daily_quota_used || 0
    })

  } catch (error) {
    console.error('Error resetting quota:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}