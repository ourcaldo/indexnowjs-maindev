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
import { z } from 'zod'

// Schema for MFA generation request
const mfaGenerateSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

export const POST = publicApiRouteWrapper(async (request: NextRequest, endpoint: string) => {
  // Validate request body
  const validationResult = await validateRequest(
    request,
    mfaGenerateSchema,
    undefined,
    endpoint
  )

  if (!validationResult.success) {
    return createErrorResponse(validationResult.error)
  }

  const { email, password } = validationResult.data as { email: string; password: string }

  try {
    logger.info({ email }, 'Attempting MFA OTP generation for user login')

    // First verify the user's email and password with Supabase Auth
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      logger.warn({ email, error: authError?.message }, 'Invalid credentials provided for MFA generation')
      
      const authErrorObj = await ErrorHandlingService.createError(
        ErrorType.AUTHENTICATION,
        `Invalid credentials for MFA generation: ${email}`,
        {
          severity: ErrorSeverity.MEDIUM,
          endpoint,
          statusCode: 401,
          userMessageKey: 'invalid_credentials',
          metadata: { 
            email,
            errorCode: authError?.code || 'invalid_credentials',
            operation: 'mfa_generation'
          }
        }
      )

      return createErrorResponse(authErrorObj)
    }

    // Get user profile for name
    const { data: userProfile } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('full_name')
      .eq('user_id', authData.user.id)
      .single()

    const userName = userProfile?.full_name || authData.user.user_metadata?.full_name || email.split('@')[0]

    logger.info({ 
      userId: authData.user.id, 
      email, 
      userName 
    }, 'Credentials verified, generating MFA OTP code')

    // Generate and send OTP
    const otpResult = await otpService.generateLoginMFACode(
      authData.user.id,
      email,
      userName,
      request
    )

    if (!otpResult.success) {
      logger.error({ 
        userId: authData.user.id, 
        email, 
        error: otpResult.message 
      }, 'Failed to generate MFA OTP code')
      
      const otpError = await ErrorHandlingService.createError(
        ErrorType.SYSTEM,
        `MFA OTP generation failed: ${otpResult.message}`,
        {
          severity: ErrorSeverity.HIGH,
          endpoint,
          statusCode: 500,
          userMessageKey: 'default',
          metadata: { 
            userId: authData.user.id,
            email,
            operation: 'mfa_otp_generation'
          }
        }
      )

      return createErrorResponse(otpError)
    }

    logger.info({ 
      userId: authData.user.id, 
      email,
      otpId: otpResult.otpId 
    }, 'MFA OTP code generated and sent successfully')

    // Return success response (don't include sensitive data like actual OTP)
    return createApiResponse({
      message: otpResult.message,
      email: email,
      expiresAt: otpResult.expiresAt,
      userId: authData.user.id // Include userId for frontend MFA verification
    })

  } catch (error) {
    logger.error({ error, email }, 'Unexpected error during MFA OTP generation')
    
    const systemError = await ErrorHandlingService.createError(
      ErrorType.SYSTEM,
      error as Error,
      {
        severity: ErrorSeverity.CRITICAL,
        endpoint,
        statusCode: 500,
        userMessageKey: 'default',
        metadata: { 
          operation: 'mfa_otp_generation',
          email 
        }
      }
    )
    return createErrorResponse(systemError)
  }
})