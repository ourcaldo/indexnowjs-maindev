import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { loginSchema } from '@/shared/schema'
import { 
  publicApiRouteWrapper,
  validateRequest,
  createApiResponse,
  createErrorResponse
} from '@/lib/api-middleware'
import { 
  ErrorHandlingService, 
  ErrorType, 
  ErrorSeverity, 
  logger 
} from '@/lib/error-handling'
import { ActivityLogger, ActivityEventTypes } from '@/lib/activity-logger'

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