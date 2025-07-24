import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { registerSchema } from '@/shared/schema'
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
    registerSchema,
    undefined,
    endpoint
  )

  if (!validationResult.success) {
    return createErrorResponse(validationResult.error)
  }

  const { name, email, password } = validationResult.data as { 
    name: string; 
    email: string; 
    password: string 
  }

  try {
    // Register with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (error) {
      const authError = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        `Registration failed for ${email}: ${error.message}`,
        {
          severity: ErrorSeverity.MEDIUM,
          endpoint,
          statusCode: 400,
          userMessageKey: 'default',
          metadata: { 
            email,
            errorCode: error.code || 'unknown',
            operation: 'user_registration'
          }
        }
      )
      return createErrorResponse(authError)
    }

    // Log successful registration
    logger.info({
      userId: data.user?.id,
      email: data.user?.email,
      endpoint,
      registrationMethod: 'email_password'
    }, 'User registered successfully')

    // Return user data
    return createApiResponse({
      user: data.user,
      session: data.session,
      message: 'Registration successful. Please check your email to verify your account.',
    }, 201)

  } catch (error) {
    const systemError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      {
        severity: ErrorSeverity.CRITICAL,
        endpoint,
        statusCode: 500,
        userMessageKey: 'default',
        metadata: { operation: 'user_registration', email }
      }
    )
    return createErrorResponse(systemError)
  }
})