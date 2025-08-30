import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { registerSchema } from '@/shared/schema'
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
    registerSchema,
    undefined,
    endpoint
  )

  if (!validationResult.success) {
    return createErrorResponse(validationResult.error)
  }

  const { email, password, first_name, last_name } = validationResult.data as any

  try {
    // Check if user already exists in auth.users
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingAuthUser.users?.some(user => user.email === email)

    if (userExists) {
      const existingUserError = await ErrorHandlingService.createError(
        ErrorType.VALIDATION,
        `User with email ${email} already exists`,
        {
          severity: ErrorSeverity.LOW,
          endpoint,
          statusCode: 409,
          userMessageKey: 'user_already_exists',
          metadata: { email }
        }
      )
      
      return createErrorResponse(existingUserError)
    }

    // Create user in Supabase auth
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        first_name,
        last_name,
        role: 'user'
      }
    })

    if (signUpError || !authData.user) {
      const signUpFailureError = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        `Registration failed: ${signUpError?.message}`,
        {
          severity: ErrorSeverity.MEDIUM,
          endpoint,
          statusCode: 400,
          userMessageKey: 'registration_failed',
          metadata: { 
            email,
            errorCode: signUpError?.code,
            errorMessage: signUpError?.message
          }
        }
      )
      
      return createErrorResponse(signUpFailureError)
    }

    // Get the default free package
    const { data: freePackage, error: packageError } = await supabaseAdmin
      .from('indb_payment_packages')
      .select('id')
      .eq('slug', 'free')
      .eq('is_active', true)
      .single()

    if (packageError || !freePackage) {
      logger.warn('Free package not found, user will be created without package', { email })
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .insert({
        user_id: authData.user.id,
        first_name,
        last_name,
        full_name: `${first_name} ${last_name}`,
        email,
        role: 'user',
        package_id: freePackage?.id || null,
        subscribed_at: new Date().toISOString(),
        expires_at: null, // Free package never expires
        daily_quota_used: 0,
        daily_quota_reset_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      // If profile creation fails, clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      const profileCreationError = await ErrorHandlingService.createError(
        ErrorType.DATABASE,
        `Profile creation failed: ${profileError.message}`,
        {
          severity: ErrorSeverity.HIGH,
          endpoint,
          statusCode: 500,
          metadata: { 
            email,
            userId: authData.user.id,
            dbError: profileError.message
          }
        }
      )
      
      return createErrorResponse(profileCreationError)
    }

    // Log successful registration
    try {
      await ActivityLogger.logUserActivity(
        authData.user.id,
        ActivityEventTypes.USER_REGISTRATION,
        `New user registered: ${email}`,
        request,
        {
          email,
          firstName: first_name,
          lastName: last_name,
          packageId: freePackage?.id,
          registrationMethod: 'email_password'
        }
      )
    } catch (logError) {
      logger.error('Failed to log user registration', { 
        error: logError,
        userId: authData.user.id 
      })
    }

    return createApiResponse({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        first_name,
        last_name,
        role: 'user'
      },
      message: 'Registration successful'
    }, 201)

  } catch (error: any) {
    const systemError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      `Registration system error: ${error.message}`,
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