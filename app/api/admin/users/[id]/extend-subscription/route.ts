import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { requireSuperAdminAuth } from '@/lib/auth'
import { ActivityLogger } from '@/lib/monitoring'

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
    const body = await request.json()
    const { days = 30 } = body

    // Get current user data
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('full_name, expires_at, package:indb_payment_packages(name, slug)')
      .eq('user_id', userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate new expiry date
    const currentExpiry = currentUser.expires_at ? new Date(currentUser.expires_at) : new Date()
    const now = new Date()
    const baseDate = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)

    // Update subscription expiry
    const { error: updateError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        expires_at: newExpiry.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error extending subscription:', updateError)
      return NextResponse.json(
        { error: 'Failed to extend subscription' },
        { status: 500 }
      )
    }

    // Log admin activity
    try {
      await ActivityLogger.logAdminAction(
        adminUser.id,
        'subscription_extend',
        userId,
        `Extended subscription for ${currentUser.full_name || 'User'} by ${days} days`,
        request,
        { 
          subscriptionExtend: true,
          extensionDays: days,
          previousExpiry: currentUser.expires_at,
          newExpiry: newExpiry.toISOString(),
          userFullName: currentUser.full_name 
        }
      )
    } catch (logError) {
      console.error('Failed to log subscription extension activity:', logError)
    }

    return NextResponse.json({ 
      success: true,
      message: `Subscription successfully extended by ${days} days`,
      new_expiry: newExpiry.toISOString()
    })

  } catch (error) {
    console.error('Error extending subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}