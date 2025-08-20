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
        
        // Search for existing profiles with broader search first
        logger.info({ userId: data.user.id }, 'Searching for profiles...')
        
        const { data: allProfiles, error: searchError } = await supabase
          .from('indb_auth_user_profiles')
          .select('*')
          .limit(10)

        if (searchError) {
          logger.error({ error: searchError }, 'Failed to search profiles')
        } else {
          logger.info({ 
            userId: data.user.id,
            profileCount: allProfiles?.length || 0,
            profiles: allProfiles?.map(p => ({ id: p.id, user_id: p.user_id, email: p.email }))
          }, 'Found profiles in database')
        }

        // Now search specifically for this user
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
        
        const { data: userProfile, error: userError } = await supabase
          .from('indb_auth_user_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle()

        if (userError) {
          logger.error({ error: userError, userId: data.user.id }, 'Error searching for user profile')
        } else if (userProfile) {
          logger.info({ 
            userId: data.user.id,
            profile: {
              id: userProfile.id,
              user_id: userProfile.user_id,
              full_name: userProfile.full_name,
              email: userProfile.email,
              phone_number: userProfile.phone_number,
              country: userProfile.country
            }
          }, 'Found existing user profile')

          // Update the profile with phone_number and country
          const { data: updateResult, error: updateError } = await supabase
            .from('indb_auth_user_profiles')
            .update({
              phone_number: phoneNumber,
              country: country,
              full_name: name
            })
            .eq('user_id', data.user.id)
            .select()

          if (updateError) {
            logger.error({ 
              error: updateError, 
              userId: data.user.id,
              updateData: { phoneNumber, country, name }
            }, 'Failed to update user profile with additional fields')
          } else {
            logger.info({ 
              userId: data.user.id,
              updateResult,
              updateData: { phoneNumber, country, name }
            }, 'User profile updated successfully with phone and country')
          }
        } else {
          logger.error({ userId: data.user.id }, 'No profile found for user after search')
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