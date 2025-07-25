/**
 * Comprehensive Activity Logging Service
 * Tracks all user activities across the application
 */

import { supabaseAdmin } from '@/lib/supabase'
import { logger } from './error-handling'

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
  ADMIN_SETTINGS: 'admin_settings',
  
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
      const { data: result, error } = await supabaseAdmin
        .from('indb_security_activity_logs')
        .insert({
          user_id: data.userId,
          event_type: data.eventType,
          action_description: data.actionDescription,
          target_type: data.targetType || null,
          target_id: data.targetId || null,
          ip_address: data.ipAddress || null,
          user_agent: data.userAgent || null,
          device_info: data.deviceInfo || null,
          location_data: data.locationData || null,
          success: data.success !== false, // Default to true unless explicitly false
          error_message: data.errorMessage || null,
          metadata: data.metadata || null,
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
   * Log authentication activities
   */
  static async logAuth(userId: string, eventType: string, success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string) {
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
      ipAddress,
      userAgent,
      success,
      errorMessage,
      metadata: { timestamp: new Date().toISOString() }
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
   * Log admin activities
   */
  static async logAdminActivity(adminId: string, eventType: string, targetUserId: string, action: string, metadata?: Record<string, any>) {
    return this.logActivity({
      userId: adminId,
      eventType,
      actionDescription: action,
      targetType: 'users',
      targetId: targetUserId,
      metadata: {
        adminAction: true,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log API calls for tracking usage
   */
  static async logApiCall(userId: string, endpoint: string, method: string, success: boolean, ipAddress?: string, responseTime?: number, errorMessage?: string) {
    return this.logActivity({
      userId,
      eventType: ActivityEventTypes.API_CALL,
      actionDescription: `${method} ${endpoint}`,
      success,
      ipAddress,
      errorMessage,
      metadata: {
        endpoint,
        method,
        responseTime,
        timestamp: new Date().toISOString()
      }
    })
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