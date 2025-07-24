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
      // Log authentication failure
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
      return createErrorResponse(authError)
    }

    // Log successful authentication
    logger.info({
      userId: data.user?.id,
      email: data.user?.email,
      endpoint,
      loginMethod: 'password'
    }, 'User logged in successfully')

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