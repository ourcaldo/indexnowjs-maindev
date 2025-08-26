'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Loader2, Shield, Clock, Mail, RotateCcw } from 'lucide-react'

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

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Only allow digits

    const newOtpCode = otpCode.split('')
    newOtpCode[index] = value
    const newCode = newOtpCode.join('')
    
    setOtpCode(newCode)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (newCode.length === 6 && /^\d{6}$/.test(newCode)) {
      handleVerifyOTP(newCode)
    }
  }

  // Handle key press for backspace navigation
  const handleKeyPress = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData) {
      setOtpCode(pastedData)
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

      if (response.ok && result.data) {
        // Verification successful
        onVerificationSuccess(result.data)
      } else {
        setError(result.error?.message || 'Verification failed. Please try again.')
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
    <Card className="w-full max-w-md mx-auto p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Security Verification</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        {/* Email Badge */}
        <div className="flex items-center justify-center">
          <Badge variant="outline" className="px-3 py-1">
            <Mail className="w-4 h-4 mr-2" />
            {email}
          </Badge>
        </div>

        {/* Timer Display */}
        <div className="flex items-center justify-center space-x-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {timeLeft > 0 ? (
              <>Code expires in: <span className="font-mono font-semibold text-amber-600">{formatTime(timeLeft)}</span></>
            ) : (
              <span className="text-red-600 font-semibold">Code has expired</span>
            )}
          </span>
        </div>

        {/* OTP Input */}
        <div className="space-y-4">
          <Label className="text-center block text-sm font-medium text-gray-700 dark:text-gray-300">
            Verification Code
          </Label>
          <div className="flex justify-center space-x-2" onPaste={handlePaste}>
            {[...Array(6)].map((_, index) => (
              <Input
                key={index}
                ref={el => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={otpCode[index] || ''}
                onChange={e => handleOtpChange(index, e.target.value)}
                onKeyDown={e => handleKeyPress(index, e)}
                className="w-12 h-12 text-center text-lg font-bold border-2 focus:border-blue-500 dark:focus:border-blue-400"
                disabled={isVerifying || timeLeft === 0}
                data-testid={`otp-input-${index}`}
              />
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" data-testid="mfa-error-message">
            <p>{error}</p>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            onClick={() => handleVerifyOTP()}
            disabled={otpCode.length !== 6 || isVerifying || timeLeft === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="verify-otp-button"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>

          {/* Resend Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleResend}
            disabled={!canResend || resendCooldown > 0 || isVerifying}
            className="w-full"
            data-testid="resend-otp-button"
          >
            {resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Resend Code
              </>
            )}
          </Button>

          {/* Back to Login */}
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isVerifying}
            className="w-full text-gray-600 dark:text-gray-400"
            data-testid="back-to-login-button"
          >
            ← Back to Login
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Didn't receive the code? Check your spam folder or try resending.</p>
        </div>
      </div>
    </Card>
  )
}