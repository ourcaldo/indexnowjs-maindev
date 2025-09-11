import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { requireSuperAdminAuth, getServerAuthUser } from '@/lib/auth'
import { ActivityLogger } from '@/lib/monitoring'
import { validationMiddleware } from '@/lib/services/validation'
import { apiRequestSchemas } from '@/shared/schema'

export async function POST(request: NextRequest) {
  try {
    // System-level activity logging - no auth required since this is used by the system
    const body = await request.json()
    // Extract user info from the request body or auth header if available
    let userId = body.user_id || 'system'
    let userEmail = body.user_email || ''
    
    // Try to get user info from auth header if not provided
    if (!body.user_id) {
      try {
        const user = await getServerAuthUser(request)
        if (user) {
          userId = user.id
          userEmail = user.email || ''
        }
      } catch (e) {
        // No auth provided, use system
        userId = 'system'
      }
    }
    
    // Extract and parse IP address properly (handle multiple IPs from proxy)
    const rawIpAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || body.ip_address || ''
    const cleanIpAddress = rawIpAddress.split(',')[0].trim() || ''

    // Log the activity using the ActivityLogger static method
    await ActivityLogger.logActivity({
      userId,
      eventType: body.eventType || body.action_type || 'system_action',
      actionDescription: body.actionDescription || body.action_description || 'System action performed',
      ipAddress: cleanIpAddress,
      userAgent: request.headers.get('user-agent') || body.user_agent || '',
      request,
      metadata: {
        userEmail,
        originalIpHeader: rawIpAddress,
        ...body.metadata || {}
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Activity logged successfully'
    })

  } catch (error: any) {
    console.error('Activity log POST error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Apply validation middleware
    const { response, validationResult } = await validationMiddleware.validateRequest(request, {
      requireAuth: true,
      requireAdmin: true,
      validateQuery: apiRequestSchemas.adminActivityQuery,
      rateLimitConfig: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 20 // 20 requests per minute for admin activity logs
      }
    });

    // Return error response if validation failed
    if (response) {
      return response;
    }

    // Get validated query parameters
    const queryParams = validationResult.sanitizedData?.query || {};
    const { 
      days = 7, 
      limit = 100, 
      page = 1, 
      user: userId = null, 
      search: searchTerm = '', 
      event_type: eventType = 'all' 
    } = queryParams;

    const offset = (page - 1) * limit;

    // Additional super admin check
    await requireSuperAdminAuth(request)

    // Calculate date filter
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - days)

    // Build query with filters
    let query = supabaseAdmin
      .from('indb_security_activity_logs')
      .select('*')
      .gte('created_at', dateFilter.toISOString())

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (eventType !== 'all') {
      query = query.eq('event_type', eventType)
    }

    if (searchTerm) {
      query = query.or(`action_description.ilike.%${searchTerm}%,user_agent.ilike.%${searchTerm}%`)
    }

    // Apply pagination and ordering
    const { data: logs, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching activity logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activity logs' },
        { status: 500 }
      )
    }

    // Get user profiles for each log to include user name/email
    const logsWithUserData = []
    
    for (const log of logs || []) {
      try {
        const { data: userProfile, error: profileError } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('full_name, user_id')
          .eq('user_id', log.user_id)
          .single()

        let userEmail = null
        if (!profileError && userProfile) {
          try {
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userProfile.user_id)
            if (!authError && authUser?.user) {
              userEmail = authUser.user.email
            }
          } catch (authFetchError) {
            console.error(`Failed to fetch auth data for user ${log.user_id}:`, authFetchError)
          }
        }

        logsWithUserData.push({
          ...log,
          user_name: userProfile?.full_name || 'Unknown User',
          user_email: userEmail || 'Unknown Email'
        })
      } catch (fetchError) {
        console.error(`Failed to fetch user data for log ${log.id}:`, fetchError)
        logsWithUserData.push({
          ...log,
          user_name: 'Unknown User',
          user_email: 'Unknown Email'
        })
      }
    }

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('indb_security_activity_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateFilter.toISOString())

    return NextResponse.json({ 
      success: true, 
      logs: logsWithUserData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error: any) {
    console.error('Admin activity logs API error:', error)
    
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