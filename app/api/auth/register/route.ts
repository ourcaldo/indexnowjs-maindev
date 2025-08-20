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
import { ActivityLogger, ActivityEventTypes } from '@/lib/activity-logger'

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

  const { name, email, password, phoneNumber, country } = validationResult.data as { 
    name: string; 
    email: string; 
    password: string;
    phoneNumber: string;
    country: string;
  }

  try {
    // Register with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone_number: phoneNumber,
          country: country,
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

      // Log failed registration attempt
      try {
        await ActivityLogger.logAuth(
          email, // Use email as ID for failed attempts
          ActivityEventTypes.REGISTER,
          false,
          request,
          error.message
        )
      } catch (logError) {
        logger.error({ error: logError, email }, 'Failed to log registration failure')
      }

      return createErrorResponse(authError)
    }

    // Update user profile with additional details after triggers create the basic profile
    if (data.user?.id) {
      try {
        logger.info({ 
          userId: data.user.id, 
          phoneNumber, 
          country, 
          name 
        }, 'Starting profile update process...')
        
        // Wait a moment for triggers to create the basic profile
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // First check if profile exists
        const { data: existingProfile, error: checkError } = await supabase
          .from('indb_auth_user_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single()

        let profileResult;
        let profileError;

        if (checkError && checkError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          logger.info({ userId: data.user.id }, 'Profile not found, creating new profile...')
          
          const { data: createResult, error: createError } = await supabase
            .from('indb_auth_user_profiles')
            .insert({
              user_id: data.user.id,
              full_name: name,
              phone_number: phoneNumber,
              country: country,
              email: data.user.email,
              role: 'user',
              email_notifications: true
            })
            .select()

          profileResult = createResult
          profileError = createError
          
          if (createError) {
            logger.error({ 
              error: createError, 
              userId: data.user.id,
              insertData: { userId: data.user.id, name, phoneNumber, country, email: data.user.email }
            }, 'Failed to create user profile')
          } else {
            logger.info({ 
              userId: data.user.id,
              createResult,
              insertData: { userId: data.user.id, name, phoneNumber, country, email: data.user.email }
            }, 'User profile created successfully')
          }
        } else if (checkError) {
          logger.error({ error: checkError, userId: data.user.id }, 'Failed to check existing profile')
          profileError = checkError
        } else {
          // Profile exists, update it
          logger.info({ 
            userId: data.user.id, 
            existingProfile: {
              id: existingProfile?.id,
              user_id: existingProfile?.user_id,
              full_name: existingProfile?.full_name,
              email: existingProfile?.email,
              phone_number: existingProfile?.phone_number,
              country: existingProfile?.country
            }
          }, 'Found existing profile, updating...')
          
          const { data: updateResult, error: updateError } = await supabase
            .from('indb_auth_user_profiles')
            .update({
              phone_number: phoneNumber,
              country: country,
              full_name: name
            })
            .eq('user_id', data.user.id)
            .select()

          profileResult = updateResult
          profileError = updateError
          
          if (updateError) {
            logger.error({ 
              error: updateError, 
              userId: data.user.id,
              updateData: { phoneNumber, country, name }
            }, 'Failed to update user profile')
          } else {
            logger.info({ 
              userId: data.user.id,
              updateResult,
              updateData: { phoneNumber, country, name }
            }, 'User profile updated successfully')
          }
        }

        if (profileError) {
          logger.error({ 
            error: profileError, 
            userId: data.user.id
          }, 'Failed to create/update user profile')
        } else {
          logger.info({ 
            userId: data.user.id,
            profileResult
          }, 'User profile created/updated successfully with all fields')
        }
      } catch (profileError) {
        logger.error({ error: profileError, userId: data.user.id }, 'Failed to update user profile')
      }
    }

    // Log successful registration
    logger.info({
      userId: data.user?.id,
      email: data.user?.email,
      endpoint,
      registrationMethod: 'email_password'
    }, 'User registered successfully')

    // Log successful registration with comprehensive activity logging
    if (data.user?.id) {
      try {
        await ActivityLogger.logAuth(
          data.user.id,
          ActivityEventTypes.REGISTER,
          true,
          request
        )
      } catch (logError) {
        logger.error({ error: logError, userId: data.user.id }, 'Failed to log successful registration')
      }
    }

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