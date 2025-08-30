import { NextRequest } from 'next/server'
import { supabase } from '@/lib/database'
import { loginSchema } from '@/shared/schema'
import { 
  publicApiRouteWrapper,
  validateRequest,
  createApiResponse,
  createErrorResponse
} from '@/lib/core/api-middleware'
import { 
  ErrorHandlingService, 
  ErrorType, 
  ErrorSeverity, 
  logger 
} from '@/lib/monitoring/error-handling'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'

export const POST = publicApiRouteWrapper(async (request: NextRequest, endpoint: string) => {
  // Validate request body
  const validationResult = await validateRequest(
    request,
    loginSchema,
    undefined,
    endpoint
  )

  if (!validationResult.success) {
    return createErrorResponse(validationResult.error)
  }

  const { email, password } = validationResult.data as { email: string; password: string }

  try {
    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Log authentication failure with activity logging
      const authError = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        `Login failed for ${email}: ${error.message}`,
        {
          severity: ErrorSeverity.MEDIUM,
          endpoint,
          statusCode: 401,
          userMessageKey: 'invalid_credentials',
          metadata: { 
            email,
            errorCode: error.code || 'unknown',
            attempt: 'password_login'
          }
        }
      )

      // Log failed login attempt (use email as temporary user ID for failed attempts)
      try {
        await ActivityLogger.logAuth(
          email, // Use email as ID for failed attempts
          ActivityEventTypes.LOGIN,
          false,
          request,
          error.message
        )
      } catch (logError) {
        logger.error({ error: logError, email }, 'Failed to log authentication failure')
      }

      return createErrorResponse(authError)
    }

    // Log successful authentication
    logger.info({
      userId: data.user?.id,
      email: data.user?.email,
      endpoint,
      loginMethod: 'password'
    }, 'User logged in successfully')

    // Log successful login with comprehensive activity logging
    if (data.user?.id) {
      try {
        await ActivityLogger.logAuth(
          data.user.id,
          ActivityEventTypes.LOGIN,
          true,
          request
        )
      } catch (logError) {
        logger.error({ error: logError, userId: data.user.id }, 'Failed to log successful authentication')
      }

      // Send login notification email (fire-and-forget, completely async)
      process.nextTick(async () => {
        try {
          const { loginNotificationService } = await import('@/lib/email/login-notification-service')
          const { getRequestInfo } = await import('@/lib/utils/ip-device-utils')
          
          // Extract request information for notification
          const requestInfo = await getRequestInfo(request)
          
          // Send notification asynchronously with timeout protection
          Promise.race([
            loginNotificationService.sendLoginNotification({
              userId: data.user.id,
              userEmail: data.user.email || '',
              userName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
              ipAddress: requestInfo.ipAddress || 'Unknown',
              userAgent: requestInfo.userAgent || 'Unknown',
              deviceInfo: requestInfo.deviceInfo || undefined,
              locationData: requestInfo.locationData || undefined,
              loginTime: new Date().toISOString()
            }),
            // Timeout after 30 seconds
            new Promise((_, reject) => setTimeout(() => reject(new Error('Email sending timeout')), 30000))
          ]).then(() => {
            logger.info({ userId: data.user.id }, 'Login notification email sent successfully')
          }).catch((notificationError) => {
            logger.error({ error: notificationError, userId: data.user.id }, 'Failed to send login notification email')
          })
          
        } catch (importError) {
          logger.error({ error: importError, userId: data.user.id }, 'Failed to initialize login notification service')
        }
      })
    }

    // Return user data and session
    return createApiResponse({
      user: data.user,
      session: data.session,
    })

  } catch (error) {
    const systemError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      {
        severity: ErrorSeverity.HIGH,
        endpoint,
        statusCode: 500,
        userMessageKey: 'default',
        metadata: { operation: 'user_login' }
      }
    )
    return createErrorResponse(systemError)
  }
})