import { supabaseAdmin } from '@/lib/database'
import { emailService } from '@/lib/email/emailService'
import { logger } from '@/lib/monitoring/error-handling'
import { getRequestInfo } from '@/lib/utils/ip-device-utils'
import { NextRequest } from 'next/server'

export interface OTPGenerationResult {
  success: boolean
  message: string
  otpId?: string
  expiresAt?: Date
}

export interface OTPVerificationResult {
  success: boolean
  message: string
  userId?: string
  remainingAttempts?: number
}

export interface OTPData {
  id: string
  user_id: string
  email: string
  otp_code: string
  otp_type: 'login_mfa' | 'password_reset' | 'email_verification'
  is_used: boolean
  attempts_count: number
  max_attempts: number
  expires_at: string
  created_at: string
}

export class OTPService {
  private static readonly OTP_EXPIRY_MINUTES = 5
  private static readonly OTP_LENGTH = 6
  private static readonly MAX_ATTEMPTS = 3

  /**
   * Generate a random 6-digit OTP code
   */
  private static generateOTPCode(): string {
    return Math.random().toString().slice(2, 8).padStart(6, '0')
  }

  /**
   * Generate and store OTP code for user login MFA
   */
  static async generateLoginMFACode(
    userId: string,
    email: string,
    userName: string,
    request: NextRequest
  ): Promise<OTPGenerationResult> {
    try {
      // Generate OTP code
      const otpCode = this.generateOTPCode()
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000)
      
      logger.info({
        userId,
        email,
        expiresAt: expiresAt.toISOString()
      }, 'Generating MFA OTP code')

      // Invalidate any existing unused OTP codes for this user and type
      await supabaseAdmin
        .from('indb_security_otp_codes')
        .update({ is_used: true })
        .eq('user_id', userId)
        .eq('otp_type', 'login_mfa')
        .eq('is_used', false)

      // Store new OTP code in database
      const { data: otpData, error: otpError } = await supabaseAdmin
        .from('indb_security_otp_codes')
        .insert({
          user_id: userId,
          email,
          otp_code: otpCode,
          otp_type: 'login_mfa',
          expires_at: expiresAt.toISOString(),
          max_attempts: this.MAX_ATTEMPTS
        })
        .select('id')
        .single()

      if (otpError) {
        logger.error({ error: otpError, userId, email }, 'Failed to store OTP code in database')
        return {
          success: false,
          message: 'Failed to generate verification code. Please try again.'
        }
      }

      // Get request information for email
      const requestInfo = await getRequestInfo(request)

      // Send OTP via email
      try {
        await emailService.sendOTPVerification(email, {
          userName: userName || email.split('@')[0],
          userEmail: email,
          otpCode,
          loginTime: new Date().toLocaleString('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          }),
          ipAddress: requestInfo.ipAddress || 'Unknown',
          deviceInfo: typeof requestInfo.deviceInfo === 'string' 
            ? requestInfo.deviceInfo 
            : (requestInfo.deviceInfo as any)?.deviceType || 'Unknown device',
          locationData: requestInfo.locationData 
            ? `${(requestInfo.locationData as any)?.city || ''}, ${(requestInfo.locationData as any)?.country || ''}`.trim().replace(/^,\s*/, '') || undefined
            : undefined
        })

        logger.info({ userId, email, otpId: otpData.id }, 'MFA OTP code generated and sent successfully')

        return {
          success: true,
          message: 'Verification code sent to your email. Please check your inbox.',
          otpId: otpData.id,
          expiresAt
        }
      } catch (emailError) {
        logger.error({ error: emailError, userId, email }, 'Failed to send OTP email')
        
        // Mark OTP as used since email failed
        await supabaseAdmin
          .from('indb_security_otp_codes')
          .update({ is_used: true })
          .eq('id', otpData.id)

        return {
          success: false,
          message: 'Failed to send verification code. Please try again.'
        }
      }
    } catch (error) {
      logger.error({ error, userId, email }, 'Unexpected error generating MFA OTP code')
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      }
    }
  }

  /**
   * Verify OTP code for user login MFA
   */
  static async verifyLoginMFACode(
    email: string,
    otpCode: string
  ): Promise<OTPVerificationResult> {
    try {
      logger.info({ email, otpCode: '***' }, 'Verifying MFA OTP code')

      // Find the most recent unused OTP for this email
      const { data: otpData, error: fetchError } = await supabaseAdmin
        .from('indb_security_otp_codes')
        .select('*')
        .eq('email', email)
        .eq('otp_type', 'login_mfa')
        .eq('is_used', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError) {
        logger.error({ error: fetchError, email }, 'Failed to fetch OTP code from database')
        return {
          success: false,
          message: 'Verification failed. Please try again.'
        }
      }

      if (!otpData) {
        logger.warn({ email }, 'No valid OTP code found for email')
        return {
          success: false,
          message: 'Invalid or expired verification code. Please request a new one.'
        }
      }

      const otp = otpData as OTPData

      // Check if max attempts reached
      if (otp.attempts_count >= otp.max_attempts) {
        logger.warn({ email, otpId: otp.id, attempts: otp.attempts_count }, 'OTP max attempts exceeded')
        
        // Mark as used
        await supabaseAdmin
          .from('indb_security_otp_codes')
          .update({ is_used: true })
          .eq('id', otp.id)

        return {
          success: false,
          message: 'Too many failed attempts. Please request a new verification code.'
        }
      }

      // Check if OTP code matches
      if (otp.otp_code !== otpCode) {
        // Increment attempts count
        const newAttempts = otp.attempts_count + 1
        await supabaseAdmin
          .from('indb_security_otp_codes')
          .update({ attempts_count: newAttempts })
          .eq('id', otp.id)

        const remainingAttempts = otp.max_attempts - newAttempts

        logger.warn({ 
          email, 
          otpId: otp.id, 
          attempts: newAttempts,
          remaining: remainingAttempts 
        }, 'Invalid OTP code provided')

        return {
          success: false,
          message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
          remainingAttempts
        }
      }

      // OTP is valid - mark as used
      await supabaseAdmin
        .from('indb_security_otp_codes')
        .update({ is_used: true })
        .eq('id', otp.id)

      logger.info({ 
        userId: otp.user_id, 
        email, 
        otpId: otp.id 
      }, 'MFA OTP code verified successfully')

      return {
        success: true,
        message: 'Verification successful. You are now logged in.',
        userId: otp.user_id
      }

    } catch (error) {
      logger.error({ error, email }, 'Unexpected error verifying MFA OTP code')
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      }
    }
  }

  /**
   * Clean up expired OTP codes (should be called by a background job)
   */
  static async cleanupExpiredCodes(): Promise<number> {
    try {
      const { data, error } = await supabaseAdmin
        .from('indb_security_otp_codes')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id')

      if (error) {
        logger.error({ error }, 'Failed to cleanup expired OTP codes')
        return 0
      }

      const deletedCount = data?.length || 0
      logger.info({ deletedCount }, 'Cleaned up expired OTP codes')
      
      return deletedCount
    } catch (error) {
      logger.error({ error }, 'Unexpected error cleaning up expired OTP codes')
      return 0
    }
  }
}

export const otpService = OTPService