/**
 * Comprehensive Activity Logging Service
 * Tracks all user activities across the application
 */

import { supabaseAdmin } from '@/lib/supabase'
import { logger } from './error-handling'
import { getRequestInfo, formatDeviceInfo, formatLocationData, getSecurityRiskLevel } from './ip-device-utils'
import { NextRequest } from 'next/server'

export interface ActivityLogData {
  userId: string
  eventType: string
  actionDescription: string
  targetType?: string
  targetId?: string
  ipAddress?: string
  userAgent?: string
  deviceInfo?: Record<string, any>
  locationData?: Record<string, any>
  success?: boolean
  errorMessage?: string
  metadata?: Record<string, any>
  request?: NextRequest // Optional request object for auto-extraction
}

export interface ActivityLogEntry {
  id: string
  user_id: string
  event_type: string
  action_description: string
  target_type?: string
  target_id?: string
  ip_address?: string
  user_agent?: string
  device_info?: Record<string, any>
  location_data?: Record<string, any>
  success: boolean
  error_message?: string
  metadata?: Record<string, any>
  created_at: string
  user_name?: string
  user_email?: string
}

// Common event types for consistency
export const ActivityEventTypes = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGE: 'password_change',
  
  // Profile Management
  PROFILE_UPDATE: 'profile_update',
  SETTINGS_CHANGE: 'settings_change',
  
  // Job Management
  JOB_CREATE: 'job_create',
  JOB_UPDATE: 'job_update',
  JOB_DELETE: 'job_delete',
  JOB_START: 'job_start',
  JOB_PAUSE: 'job_pause',
  JOB_RESUME: 'job_resume',
  JOB_CANCEL: 'job_cancel',
  
  // Service Account Management
  SERVICE_ACCOUNT_ADD: 'service_account_add',
  SERVICE_ACCOUNT_UPDATE: 'service_account_update',
  SERVICE_ACCOUNT_DELETE: 'service_account_delete',
  
  // API Calls
  API_CALL: 'api_call',
  GOOGLE_API_CALL: 'google_api_call',
  
  // Admin Activities
  ADMIN_LOGIN: 'admin_login',
  USER_MANAGEMENT: 'user_management',
  USER_SUSPEND: 'user_suspend',
  USER_UNSUSPEND: 'user_unsuspend',
  USER_PASSWORD_RESET: 'user_password_reset',
  USER_PROFILE_UPDATE: 'user_profile_update',
  USER_ROLE_CHANGE: 'user_role_change',
  ADMIN_SETTINGS: 'admin_settings',
  
  // Page Views & Navigation
  PAGE_VIEW: 'page_view',
  DASHBOARD_VIEW: 'dashboard_view',
  SETTINGS_VIEW: 'settings_view',
  ADMIN_PANEL_ACCESS: 'admin_panel_access',
  USER_SECURITY_VIEW: 'user_security_view',
  USER_ACTIVITY_VIEW: 'user_activity_view',
  
  // System Events
  ERROR_OCCURRED: 'error_occurred',
  SECURITY_VIOLATION: 'security_violation',
  QUOTA_EXCEEDED: 'quota_exceeded',
} as const

export class ActivityLogger {
  /**
   * Log user activity with comprehensive tracking
   */
  static async logActivity(data: ActivityLogData): Promise<string | null> {
    try {
      // Auto-extract request info if request is provided but other fields are missing
      let { ipAddress, userAgent, deviceInfo, locationData } = data
      
      if (data.request && (!ipAddress || !userAgent || !deviceInfo)) {
        const requestInfo = await getRequestInfo(data.request)
        ipAddress = ipAddress || requestInfo.ipAddress || undefined
        userAgent = userAgent || requestInfo.userAgent || undefined
        deviceInfo = deviceInfo || requestInfo.deviceInfo || undefined
        locationData = locationData || requestInfo.locationData || undefined
      }
      
      // Enhance metadata with formatted info
      const enhancedMetadata = {
        ...(data.metadata || {}),
        deviceFormatted: deviceInfo ? formatDeviceInfo(deviceInfo as any) : null,
        locationFormatted: locationData ? formatLocationData(locationData as any) : null,
        timestamp: new Date().toISOString()
      }

      const { data: result, error } = await supabaseAdmin
        .from('indb_security_activity_logs')
        .insert({
          user_id: data.userId,
          event_type: data.eventType,
          action_description: data.actionDescription,
          target_type: data.targetType || null,
          target_id: data.targetId || null,
          ip_address: ipAddress || null,
          user_agent: userAgent || null,
          device_info: deviceInfo || null,
          location_data: locationData || null,
          success: data.success !== false, // Default to true unless explicitly false
          error_message: data.errorMessage || null,
          metadata: enhancedMetadata,
        })
        .select('id')
        .single()

      if (error) {
        logger.error({
          error: error.message,
          userId: data.userId,
          eventType: data.eventType
        }, 'Failed to log user activity')
        return null
      }

      logger.debug({
        activityId: result.id,
        userId: data.userId,
        eventType: data.eventType,
        action: data.actionDescription
      }, 'User activity logged successfully')

      return result.id
    } catch (error: any) {
      logger.error({
        error: error.message,
        userId: data.userId,
        eventType: data.eventType
      }, 'Exception while logging user activity')
      return null
    }
  }

  /**
   * Log authentication activities with enhanced tracking
   */
  static async logAuth(userId: string, eventType: string, success: boolean, request?: NextRequest, errorMessage?: string) {
    const actionDescriptions = {
      [ActivityEventTypes.LOGIN]: success ? 'User logged in successfully' : 'Failed login attempt',
      [ActivityEventTypes.LOGOUT]: 'User logged out',
      [ActivityEventTypes.REGISTER]: success ? 'User registered successfully' : 'Failed registration attempt',
      [ActivityEventTypes.PASSWORD_RESET]: 'Password reset requested',
      [ActivityEventTypes.PASSWORD_CHANGE]: success ? 'Password changed successfully' : 'Failed password change',
    }

    return this.logActivity({
      userId,
      eventType,
      actionDescription: actionDescriptions[eventType as keyof typeof actionDescriptions] || eventType,
      success,
      errorMessage,
      request,
      metadata: { authenticationEvent: true }
    })
  }

  /**
   * Log job management activities
   */
  static async logJobActivity(userId: string, eventType: string, jobId: string, jobName: string, metadata?: Record<string, any>) {
    const actionDescriptions = {
      [ActivityEventTypes.JOB_CREATE]: `Created new job: ${jobName}`,
      [ActivityEventTypes.JOB_UPDATE]: `Updated job: ${jobName}`,
      [ActivityEventTypes.JOB_DELETE]: `Deleted job: ${jobName}`,
      [ActivityEventTypes.JOB_START]: `Started job: ${jobName}`,
      [ActivityEventTypes.JOB_PAUSE]: `Paused job: ${jobName}`,
      [ActivityEventTypes.JOB_RESUME]: `Resumed job: ${jobName}`,
      [ActivityEventTypes.JOB_CANCEL]: `Cancelled job: ${jobName}`,
    }

    return this.logActivity({
      userId,
      eventType,
      actionDescription: actionDescriptions[eventType as keyof typeof actionDescriptions] || eventType,
      targetType: 'jobs',
      targetId: jobId,
      metadata: {
        jobName,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log service account activities
   */
  static async logServiceAccountActivity(userId: string, eventType: string, serviceAccountId: string, serviceAccountName: string, metadata?: Record<string, any>) {
    const actionDescriptions = {
      [ActivityEventTypes.SERVICE_ACCOUNT_ADD]: `Added service account: ${serviceAccountName}`,
      [ActivityEventTypes.SERVICE_ACCOUNT_UPDATE]: `Updated service account: ${serviceAccountName}`,
      [ActivityEventTypes.SERVICE_ACCOUNT_DELETE]: `Deleted service account: ${serviceAccountName}`,
    }

    return this.logActivity({
      userId,
      eventType,
      actionDescription: actionDescriptions[eventType as keyof typeof actionDescriptions] || eventType,
      targetType: 'service_accounts',
      targetId: serviceAccountId,
      metadata: {
        serviceAccountName,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log admin activities with request context
   */
  static async logAdminActivity(adminId: string, eventType: string, targetUserId: string, action: string, request?: NextRequest, metadata?: Record<string, any>) {
    return this.logActivity({
      userId: adminId,
      eventType,
      actionDescription: action,
      targetType: 'users',
      targetId: targetUserId,
      request,
      metadata: {
        adminAction: true,
        ...metadata
      }
    })
  }

  /**
   * Log API calls for tracking usage with request context
   */
  static async logApiCall(userId: string, endpoint: string, method: string, success: boolean, request?: NextRequest, responseTime?: number, errorMessage?: string) {
    return this.logActivity({
      userId,
      eventType: ActivityEventTypes.API_CALL,
      actionDescription: `${method} ${endpoint}`,
      success,
      errorMessage,
      request,
      metadata: {
        endpoint,
        method,
        responseTime,
        apiCall: true
      }
    })
  }

  /**
   * Log user dashboard activities (for regular users)
   */
  static async logUserDashboardActivity(userId: string, action: string, details?: string, request?: NextRequest, metadata?: Record<string, any>) {
    return this.logActivity({
      userId,
      eventType: ActivityEventTypes.DASHBOARD_VIEW,
      actionDescription: details ? `${action}: ${details}` : action,
      request,
      metadata: {
        userDashboard: true,
        ...metadata
      }
    })
  }

  /**
   * Log page view activities
   */
  static async logPageView(userId: string, pagePath: string, pageTitle?: string, request?: NextRequest, metadata?: Record<string, any>) {
    return this.logActivity({
      userId,
      eventType: ActivityEventTypes.PAGE_VIEW,
      actionDescription: `Visited ${pageTitle || pagePath}`,
      request,
      metadata: {
        pagePath,
        pageTitle,
        pageView: true,
        ...metadata
      }
    })
  }

  /**
   * Log admin actions with specific event types
   */
  static async logAdminAction(userId: string, action: string, targetUserId?: string, actionDescription?: string, request?: NextRequest, metadata?: Record<string, any>) {
    let eventType: string = ActivityEventTypes.USER_MANAGEMENT
    
    // Map specific actions to event types
    if (action.includes('password') || action.includes('reset')) {
      eventType = ActivityEventTypes.USER_PASSWORD_RESET
    } else if (action.includes('suspend')) {
      eventType = ActivityEventTypes.USER_SUSPEND
    } else if (action.includes('unsuspend')) {
      eventType = ActivityEventTypes.USER_UNSUSPEND
    } else if (action.includes('profile') || action.includes('update')) {
      eventType = ActivityEventTypes.USER_PROFILE_UPDATE
    } else if (action.includes('role')) {
      eventType = ActivityEventTypes.USER_ROLE_CHANGE
    } else if (action.includes('security')) {
      eventType = ActivityEventTypes.USER_SECURITY_VIEW
    } else if (action.includes('activity')) {
      eventType = ActivityEventTypes.USER_ACTIVITY_VIEW
    }

    return this.logActivity({
      userId,
      eventType,
      actionDescription: actionDescription || `Admin action: ${action}`,
      targetType: targetUserId ? 'user' : undefined,
      targetId: targetUserId,
      request,
      metadata: {
        adminAction: true,
        action,
        ...metadata
      }
    })
  }

  /**
   * Get user's previous IPs and devices for security analysis
   */
  static async getUserSecurityHistory(userId: string): Promise<{
    previousIPs: string[]
    previousDevices: any[]
    lastActivity: string | null
  }> {
    try {
      const { data: logs, error } = await supabaseAdmin
        .from('indb_security_activity_logs')
        .select('ip_address, device_info, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        logger.error({ error: error.message, userId }, 'Failed to fetch user security history')
        return { previousIPs: [], previousDevices: [], lastActivity: null }
      }

      const uniqueIPs = new Set(logs?.map(log => log.ip_address).filter(Boolean) || [])
      const previousIPs = Array.from(uniqueIPs)
      const previousDevices = logs?.map(log => log.device_info).filter(Boolean) || []
      const lastActivity = logs?.[0]?.created_at || null

      return { previousIPs, previousDevices, lastActivity }
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Exception while fetching user security history')
      return { previousIPs: [], previousDevices: [], lastActivity: null }
    }
  }

  /**
   * Get activity logs for a specific user
   */
  static async getUserActivityLogs(userId: string, limit: number = 50, offset: number = 0): Promise<ActivityLogEntry[]> {
    try {
      const { data: logs, error } = await supabaseAdmin
        .from('indb_security_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        logger.error({ error: error.message, userId }, 'Failed to fetch user activity logs')
        return []
      }

      return logs || []
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Exception while fetching user activity logs')
      return []
    }
  }

  /**
   * Get all activity logs (admin only)
   */
  static async getAllActivityLogs(limit: number = 100, offset: number = 0, days: number = 7): Promise<ActivityLogEntry[]> {
    try {
      const dateFilter = new Date()
      dateFilter.setDate(dateFilter.getDate() - days)

      const { data: logs, error } = await supabaseAdmin
        .from('indb_security_activity_logs')
        .select('*')
        .gte('created_at', dateFilter.toISOString())
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        logger.error({ error: error.message }, 'Failed to fetch all activity logs')
        return []
      }

      return logs || []
    } catch (error: any) {
      logger.error({ error: error.message }, 'Exception while fetching all activity logs')
      return []
    }
  }
}