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

      // Log failed authentication attempt
      try {
        await ActivityLogger.logUserActivity(
          null, // No user ID for failed attempts
          ActivityEventTypes.USER_LOGIN_FAILED,
          `Failed login attempt for ${email}: ${error.message}`,
          request,
          {
            email,
            errorCode: error.code,
            errorMessage: error.message,
            loginMethod: 'password'
          }
        )
      } catch (logError) {
        logger.error('Failed to log authentication failure', { 
          error: logError,
          email 
        })
      }

      return createErrorResponse(authError)
    }

    if (!data.user || !data.session) {
      return createErrorResponse({
        type: ErrorType.AUTHENTICATION,
        message: 'Authentication failed',
        statusCode: 401
      })
    }

    // Log successful authentication
    try {
      await ActivityLogger.logUserActivity(
        data.user.id,
        ActivityEventTypes.USER_LOGIN_SUCCESS,
        `User ${email} logged in successfully`,
        request,
        {
          email,
          loginMethod: 'password',
          sessionId: data.session.access_token.substring(0, 10) + '...'
        }
      )
    } catch (logError) {
      logger.error('Failed to log successful login', { 
        error: logError,
        userId: data.user.id 
      })
    }

    return createApiResponse({
      user: data.user,
      session: data.session,
      message: 'Login successful'
    })

  } catch (error: any) {
    const systemError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      `Login system error: ${error.message}`,
      {
        severity: ErrorSeverity.HIGH,
        endpoint,
        statusCode: 500,
        metadata: { 
          email,
          systemError: error.message 
        }
      }
    )

    return createErrorResponse(systemError)
  }
})