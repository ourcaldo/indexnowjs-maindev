import { NextRequest } from 'next/server'
import { otpService } from '@/lib/auth/otp-service'
import { supabaseAdmin } from '@/lib/database'
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
import { z } from 'zod'

// Schema for MFA verification request
const mfaVerifySchema = z.object({
  email: z.string().email('Invalid email format'),
  otpCode: z.string().length(6, 'OTP code must be 6 digits').regex(/^\d{6}$/, 'OTP code must contain only digits')
})

export const POST = publicApiRouteWrapper(async (request: NextRequest, endpoint: string) => {
  // Validate request body
  const validationResult = await validateRequest(
    request,
    mfaVerifySchema,
    undefined,
    endpoint
  )

  if (!validationResult.success) {
    return createErrorResponse(validationResult.error)
  }

  const { email, otpCode } = validationResult.data as { email: string; otpCode: string }

  try {
    logger.info({ email, otpCode: '***' }, 'Attempting MFA OTP verification')

    // Verify OTP code
    const verificationResult = await otpService.verifyLoginMFACode(email, otpCode)

    if (!verificationResult.success) {
      logger.warn({ 
        email, 
        message: verificationResult.message,
        remainingAttempts: verificationResult.remainingAttempts 
      }, 'MFA OTP verification failed')
      
      const verifyError = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        `MFA OTP verification failed for ${email}: ${verificationResult.message}`,
        {
          severity: ErrorSeverity.MEDIUM,
          endpoint,
          statusCode: 401,
          userMessageKey: 'invalid_otp',
          metadata: { 
            email,
            remainingAttempts: verificationResult.remainingAttempts,
            operation: 'mfa_verification'
          }
        }
      )

      return createErrorResponse(verifyError)
    }

    // OTP verification successful - get user data and create session
    const userId = verificationResult.userId!

    // Get full user data from Supabase Auth
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError || !userData.user) {
      logger.error({ 
        userId, 
        email, 
        error: userError 
      }, 'Failed to retrieve user data after successful MFA verification')
      
      const userDataError = await ErrorHandlingService.createError(
        ErrorType.SYSTEM,
        `Failed to retrieve user data for MFA completion: ${userError?.message}`,
        {
          severity: ErrorSeverity.HIGH,
          endpoint,
          statusCode: 500,
          userMessageKey: 'default',
          metadata: { 
            userId,
            email,
            operation: 'post_mfa_user_data'
          }
        }
      )

      return createErrorResponse(userDataError)
    }

    // Generate a new session for the user (this mimics successful login)
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/dashboard`
      }
    })

    if (sessionError) {
      logger.error({ 
        userId, 
        email, 
        error: sessionError 
      }, 'Failed to generate session after successful MFA verification')
    }

    logger.info({ 
      userId, 
      email 
    }, 'MFA verification completed successfully - user authenticated')

    // Log successful MFA login
    try {
      await ActivityLogger.logAuth(
        userId,
        ActivityEventTypes.LOGIN,
        true,
        request,
        'MFA verification successful'
      )
    } catch (logError) {
      logger.error({ error: logError, userId }, 'Failed to log successful MFA authentication')
    }

    // Return successful verification response
    return createApiResponse({
      message: verificationResult.message,
      user: {
        id: userData.user.id,
        email: userData.user.email,
        name: userData.user.user_metadata?.full_name,
        emailVerification: userData.user.email_confirmed_at ? true : false,
      },
      // Note: In a production environment, you'd want to create proper JWT tokens here
      // For now, we'll let the frontend handle the session management
      mfaVerified: true,
      loginUrl: sessionData?.properties?.action_link || '/dashboard'
    })

  } catch (error) {
    logger.error({ error, email }, 'Unexpected error during MFA OTP verification')
    
    const systemError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      {
        severity: ErrorSeverity.CRITICAL,
        endpoint,
        statusCode: 500,
        userMessageKey: 'default',
        metadata: { 
          operation: 'mfa_otp_verification',
          email 
        }
      }
    )
    return createErrorResponse(systemError)
  }
})