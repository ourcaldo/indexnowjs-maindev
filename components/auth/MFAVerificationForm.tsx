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
        // Verification successful - API returns data directly, not wrapped in result.data
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
      className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-8"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: '#E0E6ED'
      }}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, #3D8BFF 0%, #2C73E6 100%)',
              boxShadow: '0 4px 12px rgba(61, 139, 255, 0.25)'
            }}
          >
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 
            className="text-2xl font-bold mb-2"
            style={{ color: '#1A1A1A' }}
          >
            Check your email
          </h2>
          <p 
            className="leading-relaxed"
            style={{ color: '#6C757D' }}
          >
            Enter the code sent to<br />
            <span className="font-medium" style={{ color: '#2C2C2E' }}>{email}</span>
          </p>
        </div>

        {/* Timer Display */}
        <div 
          className="text-center text-sm py-2 px-4 rounded-lg"
          style={{ 
            backgroundColor: '#F7F9FC', 
            color: timeLeft > 0 ? '#6C757D' : '#E63946',
            border: '1px solid #E0E6ED' 
          }}
        >
          {timeLeft > 0 ? (
            <>This code expires in {formatTime(timeLeft)}</>
          ) : (
            <span style={{ color: '#E63946' }}>Code has expired</span>
          )}
        </div>


        {/* OTP Input */}
        <div className="space-y-4">
          <div className="relative">
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
              className="w-full h-14 text-center text-2xl font-bold rounded-lg transition-all duration-200 tracking-[0.5em]"
              style={{
                backgroundColor: '#F7F9FC',
                border: `2px solid ${otpCode.length > 0 ? '#3D8BFF' : '#E0E6ED'}`,
                color: '#1A1A1A',
                outline: 'none',
                letterSpacing: '0.5em',
                paddingLeft: '0.25em'
              }}
              disabled={isVerifying || timeLeft === 0}
              data-testid="otp-input"
              onFocus={(e) => {
                e.target.style.borderColor = '#3D8BFF'
                e.target.style.boxShadow = '0 0 0 3px rgba(61, 139, 255, 0.1)'
              }}
              onBlur={(e) => {
                if (otpCode.length === 0) {
                  e.target.style.borderColor = '#E0E6ED'
                  e.target.style.boxShadow = 'none'
                }
              }}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="p-4 rounded-lg flex items-start space-x-3" 
            style={{ 
              backgroundColor: 'rgba(230, 57, 70, 0.1)', 
              border: '1px solid rgba(230, 57, 70, 0.3)' 
            }}
            data-testid="mfa-error-message"
          >
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: '#E63946' }}
            >
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <p style={{ color: '#E63946', fontSize: '14px', fontWeight: '500' }}>{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleVerifyOTP()}
            disabled={otpCode.length !== 6 || isVerifying || timeLeft === 0}
            className="w-full h-12 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
            style={{
              backgroundColor: (otpCode.length === 6 && !isVerifying && timeLeft > 0) ? '#1A1A1A' : '#E0E6ED',
              color: (otpCode.length === 6 && !isVerifying && timeLeft > 0) ? '#FFFFFF' : '#6C757D',
              cursor: (otpCode.length === 6 && !isVerifying && timeLeft > 0) ? 'pointer' : 'not-allowed'
            }}
            data-testid="verify-otp-button"
            onMouseEnter={(e) => {
              if (otpCode.length === 6 && !isVerifying && timeLeft > 0) {
                (e.target as HTMLButtonElement).style.backgroundColor = '#2C2C2E'
              }
            }}
            onMouseLeave={(e) => {
              if (otpCode.length === 6 && !isVerifying && timeLeft > 0) {
                (e.target as HTMLButtonElement).style.backgroundColor = '#1A1A1A'
              }
            }}
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
            className="w-full h-10 rounded-lg font-medium transition-all duration-200"
            style={{
              border: '2px solid #E0E6ED',
              backgroundColor: 'transparent',
              color: (canResend && resendCooldown === 0 && !isVerifying) ? '#6C757D' : '#E0E6ED'
            }}
            data-testid="resend-otp-button"
            onMouseEnter={(e) => {
              if (canResend && resendCooldown === 0 && !isVerifying) {
                (e.target as HTMLButtonElement).style.borderColor = '#3D8BFF';
                (e.target as HTMLButtonElement).style.color = '#3D8BFF'
              }
            }}
            onMouseLeave={(e) => {
              if (canResend && resendCooldown === 0 && !isVerifying) {
                (e.target as HTMLButtonElement).style.borderColor = '#E0E6ED';
                (e.target as HTMLButtonElement).style.color = '#6C757D'
              }
            }}
          >
            {resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              'Resend Code'
            )}
          </button>

          {/* Back to Login */}
          <button
            type="button"
            onClick={onBack}
            disabled={isVerifying}
            className="w-full h-10 font-medium transition-colors duration-200 text-center"
            style={{ color: '#6C757D' }}
            data-testid="back-to-login-button"
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.color = '#1A1A1A'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.color = '#6C757D'
            }}
          >
            ← Back to Login
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center text-sm" style={{ color: '#6C757D' }}>
          <p>Didn't receive the code? Check your spam folder or try resending.</p>
        </div>
      </div>
    </div>
  )
}