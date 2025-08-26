'use client'

import { useState, useEffect, useRef } from 'react'
import { Shield } from 'lucide-react'

interface MFAVerificationFormProps {
  email: string
  userName: string
  expiresAt: Date
  onVerificationSuccess: (data: any) => void
  onBack: () => void
  onResendOTP: () => void
}

export default function MFAVerificationForm({
  email,
  userName,
  expiresAt,
  onVerificationSuccess,
  onBack,
  onResendOTP
}: MFAVerificationFormProps) {
  const [otpCode, setOtpCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [canResend, setCanResend] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Calculate time left until expiry
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const difference = expiry - now

      if (difference > 0) {
        setTimeLeft(Math.floor(difference / 1000))
        setCanResend(false)
      } else {
        setTimeLeft(0)
        setCanResend(true)
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [expiresAt])

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle single input changes
  const handleSingleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '') // Only allow numbers
    if (value.length <= 6) {
      setOtpCode(value)
      setError('') // Clear error when user starts typing
      
      // Auto-submit when all 6 digits are entered
      if (value.length === 6) {
        handleVerifyOTP(value)
      }
    }
  }

  // Handle key presses for single input
  const handleSingleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && otpCode.length === 6) {
      handleVerifyOTP()
    }
    // Allow only numbers, backspace, delete, arrow keys, tab
    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      e.preventDefault()
    }
  }

  // Handle paste functionality for single input
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData) {
      setOtpCode(pastedData)
      setError('')
      if (pastedData.length === 6) {
        handleVerifyOTP(pastedData)
      }
    }
  }

  // Verify OTP code
  const handleVerifyOTP = async (code: string = otpCode) => {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otpCode: code
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Verification successful - API returns data directly
        console.log('MFA verification successful:', result)
        onVerificationSuccess(result)
      } else {
        setError(result.message || result.error?.message || 'Verification failed. Please try again.')
        setOtpCode('') // Clear the code for retry
        inputRefs.current[0]?.focus()
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setOtpCode('')
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  // Handle resend OTP
  const handleResend = async () => {
    if (!canResend || resendCooldown > 0) return

    setResendCooldown(30) // 30-second cooldown
    const cooldownTimer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    try {
      await onResendOTP()
      setError('')
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    }
  }

  return (
    <div 
      className="w-full max-w-sm mx-auto bg-white rounded-xl border p-6"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{
              backgroundColor: '#3D8BFF'
            }}
          >
            <img 
              src="https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/IndexNow-icon.png" 
              alt="Logo"
              className="w-6 h-6"
              style={{ filter: 'invert(1)' }}
            />
          </div>
          <h2 
            className="text-xl font-semibold mb-1"
            style={{ color: '#1F2937' }}
          >
            Check your email
          </h2>
          <p 
            className="text-sm"
            style={{ color: '#6B7280' }}
          >
            Enter the code sent to<br />
            <span className="font-medium" style={{ color: '#374151' }}>{email}</span>
          </p>
          <p 
            className="text-xs mt-2"
            style={{ color: timeLeft > 0 ? '#6B7280' : '#EF4444' }}
          >
            {timeLeft > 0 ? `This code expires in ${formatTime(timeLeft)}` : 'Code has expired'}
          </p>
        </div>


        {/* OTP Input */}
        <div>
          <input
            ref={el => { inputRefs.current[0] = el }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpCode}
            onChange={handleSingleInputChange}
            onKeyDown={handleSingleInputKeyPress}
            onPaste={handlePaste}
            placeholder="Enter verification code"
            className="w-full h-11 text-center text-lg font-medium rounded-md transition-all duration-200"
            style={{
              backgroundColor: '#F9FAFB',
              border: `1px solid ${otpCode.length > 0 ? '#3B82F6' : '#D1D5DB'}`,
              color: '#111827',
              outline: 'none',
              letterSpacing: '0.25em'
            }}
            disabled={isVerifying || timeLeft === 0}
            data-testid="otp-input"
            onFocus={(e) => {
              e.target.style.borderColor = '#3B82F6'
              e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)'
            }}
            onBlur={(e) => {
              if (otpCode.length === 0) {
                e.target.style.borderColor = '#D1D5DB'
                e.target.style.boxShadow = 'none'
              }
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleVerifyOTP()}
            disabled={otpCode.length !== 6 || isVerifying || timeLeft === 0}
            className="w-full h-10 rounded-md font-medium transition-all duration-200 flex items-center justify-center space-x-2"
            style={{
              backgroundColor: (otpCode.length === 6 && !isVerifying && timeLeft > 0) ? '#111827' : '#F3F4F6',
              color: (otpCode.length === 6 && !isVerifying && timeLeft > 0) ? '#FFFFFF' : '#9CA3AF',
              cursor: (otpCode.length === 6 && !isVerifying && timeLeft > 0) ? 'pointer' : 'not-allowed'
            }}
            data-testid="verify-otp-button"
          >
            {isVerifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify Code</span>
            )}
          </button>

          {/* Resend Button */}
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || resendCooldown > 0 || isVerifying}
            className="w-full h-9 font-medium transition-all duration-200 text-sm"
            style={{
              backgroundColor: 'transparent',
              color: (canResend && resendCooldown === 0 && !isVerifying) ? '#6B7280' : '#D1D5DB',
              border: 'none'
            }}
            data-testid="resend-otp-button"
          >
            {resendCooldown > 0 ? (
              `Resend Code`
            ) : (
              'Resend Code'
            )}
          </button>

          {/* Back to Login */}
          <button
            type="button"
            onClick={onBack}
            disabled={isVerifying}
            className="w-full h-9 font-medium transition-colors duration-200 text-center text-sm"
            style={{ color: '#6B7280', backgroundColor: 'transparent', border: 'none' }}
            data-testid="back-to-login-button"
          >
            ← Back to Login
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="text-center text-sm mt-2"
            style={{ color: '#EF4444' }}
            data-testid="mfa-error-message"
          >
            {error}
          </div>
        )}

        {/* Help Text */}
        <div className="text-center text-xs" style={{ color: '#9CA3AF' }}>
          <p>Can't find the email? Check your spam folder or try resending.</p>
        </div>
      </div>
    </div>
  )
}