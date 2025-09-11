import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { requireSuperAdminAuth, adminAuthService } from '@/lib/auth'
import { ActivityLogger } from '@/lib/monitoring'
import { SecurityMiddlewares } from '@/lib/services/security/middleware/unified-security-middleware'

export async function GET(request: NextRequest) {
  try {
    // ENHANCEMENT #6: Apply unified security middleware for admin endpoints
    const securityResult = await SecurityMiddlewares.ADMIN(request)
    
    if (!securityResult.shouldContinue) {
      return securityResult.response || NextResponse.json(
        { error: 'Security validation failed' },
        { status: 400 }
      )
    }

    // CRITICAL FIX: Restore requireSuperAdminAuth as defense-in-depth
    // The security middleware provides primary validation, but we need explicit RBAC check
    const authResult = await requireSuperAdminAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || 'Super admin access required' },
        { status: 403 }
      )
    }

    // Get authenticated admin user from auth result (primary) or security middleware (fallback)
    const adminUser = authResult.user || securityResult.validationResult?.user

    // Use materialized view to get all user data in a single query (fixes N+1 problem)
    const { data: usersWithAuthData, error: usersError } = await supabaseAdmin
      .from('indb_admin_user_summary')
      .select(`
        *,
        package:indb_payment_packages(
          id,
          name,
          slug,
          quota_limits
        )
      `)
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users from materialized view:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    // SECURITY: Log admin activity using enhanced tracking - mandatory for audit trail
    if (!adminUser) {
      console.error('SECURITY ERROR: Admin user not found after authentication - potential security bypass')
      return NextResponse.json(
        { error: 'Authentication error - admin user not found' },
        { status: 500 }
      )
    }

    try {
      await ActivityLogger.logAdminAction(
        adminUser.id,
        'user_list_view',
        undefined,
        `Viewed users list (${usersWithAuthData?.length || 0} users)`,
        request,
        { 
          userListView: true,
          totalUsers: usersWithAuthData?.length || 0,
          activeUsers: usersWithAuthData?.filter(u => u.role === 'user').length || 0,
          adminUsers: usersWithAuthData?.filter(u => u.role === 'admin').length || 0,
          superAdminUsers: usersWithAuthData?.filter(u => u.role === 'super_admin').length || 0,
          authMethod: 'requireSuperAdminAuth + security_middleware',
          securityValidation: securityResult.isValid
        }
      )
    } catch (logError) {
      console.error('CRITICAL: Failed to log admin activity for security audit:', logError)
      // In production, you might want to fail the request if audit logging fails
    }

    const responseData = { 
      success: true, 
      users: usersWithAuthData 
    }

    // ENHANCEMENT #6: Apply response encryption if configured
    if (securityResult.responseProcessor) {
      return await securityResult.responseProcessor(responseData)
    }
    
    return NextResponse.json(responseData)

  } catch (error: any) {
    console.error('Admin users API error:', error)
    
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