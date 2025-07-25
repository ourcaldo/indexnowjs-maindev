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
    const authResult = await requireSuperAdminAuth(request)
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { id: userId } = await params
    const body = await request.json()
    const { packageId } = body

    if (!packageId) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      )
    }

    // Verify package exists
    const { data: packageData, error: packageError } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('id, name, slug')
      .eq('id', packageId)
      .eq('is_active', true)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { error: 'Invalid package selected' },
        { status: 400 }
      )
    }

    // Get current user data for logging
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('full_name, package_id, package:indb_payment_packages(name)')
      .eq('user_id', userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user package
    const { error: updateError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .update({
        package_id: packageId,
        subscribed_at: new Date().toISOString(),
        expires_at: packageData.slug === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days for paid plans
        daily_quota_used: 0, // Reset quota when package changes
        daily_quota_reset_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error changing user package:', updateError)
      return NextResponse.json(
        { error: 'Failed to change package' },
        { status: 500 }
      )
    }

    // Log admin activity
    try {
      const oldPackageName = Array.isArray(currentUser.package) ? 
        currentUser.package[0]?.name : currentUser.package?.name || 'No Package'
      
      await ActivityLogger.logAdminAction(
        authResult.id,
        'package_change',
        userId,
        `Changed package for ${currentUser.full_name || 'User'} from "${oldPackageName}" to "${packageData.name}"`,
        request,
        { 
          packageChange: true,
          oldPackageId: currentUser.package_id,
          newPackageId: packageId,
          oldPackageName,
          newPackageName: packageData.name,
          userFullName: currentUser.full_name 
        }
      )
    } catch (logError) {
      console.error('Failed to log package change activity:', logError)
    }

    return NextResponse.json({ 
      success: true,
      message: `Package successfully changed to ${packageData.name}`,
      package: packageData
    })

  } catch (error) {
    console.error('Error changing package:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}