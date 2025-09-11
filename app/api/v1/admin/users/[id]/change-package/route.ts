import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { requireSuperAdminAuth } from '@/lib/auth'
import { ActivityLogger } from '@/lib/monitoring'
import { validationMiddleware } from '@/lib/services/validation'
import { apiRequestSchemas } from '@/shared/schema'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply validation middleware
    const { response, validationResult } = await validationMiddleware.validateRequest(request, {
      requireAuth: true,
      requireAdmin: true,
      validateBody: apiRequestSchemas.adminChangePackage,
      sanitizeHtml: true,
      rateLimitConfig: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10 // 10 package changes per minute for admin
      }
    });

    // Return error response if validation failed
    if (response) {
      return response;
    }

    // Get validated request body and admin user
    const adminUser = validationResult.user;
    const { packageId, reason, effectiveDate, notifyUser } = validationResult.sanitizedData?.body || {};
    const { id: userId } = await params;

    // Additional super admin check (stricter than middleware admin check)
    let authResult;
    try {
      authResult = await requireSuperAdminAuth(request);
    } catch (authError: any) {
      return NextResponse.json(
        { error: authError.message || 'Super admin access required' },
        { status: 403 }
      );
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