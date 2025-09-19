'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'
import { authService } from '@/lib/auth'

export default function VerifyEmail() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [canResend, setCanResend] = useState(true)
  const [countdown, setCountdown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [error, setError] = useState('')
  const [isCheckingVerification, setIsCheckingVerification] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'checking' | 'verified' | 'expired'>('pending')
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(true) // Always use full logo for verify page
  useFavicon() // Automatically updates favicon

  // Get email from URL search params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const emailParam = urlParams.get('email') || ''
      setEmail(emailParam)
      
      // If no email in URL, show error and provide option to go back
      if (!emailParam) {
        setError('Email address is missing. Please try signing up or logging in again.')
      }
    }
  }, [])

  // Countdown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
    } else if (countdown === 0 && !canResend) {
      setCanResend(true)
    }
    return () => clearTimeout(timer)
  }, [countdown, canResend])

  // Real-time verification status checking
  useEffect(() => {
    if (!email) return

    const checkVerificationStatus = async () => {
      try {
        setIsCheckingVerification(true)
        const user = await authService.getCurrentUser()
        
        if (user?.emailVerification) {
          setVerificationStatus('verified')
          // Redirect to dashboard after a brief delay
          setTimeout(() => {
            router.push('/dashboard?message=email_verified')
          }, 2000)
        }
      } catch (error) {
        // User not logged in or other error - keep checking
      } finally {
        setIsCheckingVerification(false)
      }
    }

    // Check immediately
    checkVerificationStatus()

    // Set up polling every 5 seconds
    const pollInterval = setInterval(checkVerificationStatus, 5000)

    return () => clearInterval(pollInterval)
  }, [email, router])

  const handleResendEmail = async () => {
    if (!email) {
      setError('Email address is required to resend verification.')
      return
    }

    if (!canResend) {
      return
    }

    setIsResending(true)
    setError('')
    setResendMessage('')

    try {
      const response = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setResendMessage(data.message || 'Verification email has been sent!')
        setCanResend(false)
        // Honor server-provided countdown
        setCountdown(data.canResendAfter || 60) // Default to 60 seconds
      } else if (response.status === 429) {
        setError(data.error || 'Too many requests. Please try again later.')
        setCanResend(false)
        // Honor server-provided retry after time for rate limiting
        setCountdown(data.retryAfter || 300) // Default to 5 minutes
      } else {
        setError(data.error || 'Failed to resend verification email.')
      }
    } catch (error) {
      console.error('Resend email error:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsResending(false)
    }
  }

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'verified':
        return '✅'
      case 'checking':
        return '🔄'
      case 'expired':
        return '⏰'
      default:
        return '✨'
    }
  }

  const getStatusMessage = () => {
    switch (verificationStatus) {
      case 'verified':
        return {
          title: 'Email Verified!',
          description: 'Your email has been successfully verified. Redirecting to dashboard...'
        }
      case 'checking':
        return {
          title: 'Checking verification...',
          description: 'Please wait while we check your verification status.'
        }
      case 'expired':
        return {
          title: 'Link Expired',
          description: 'Your verification link has expired. Please request a new one.'
        }
      default:
        return {
          title: 'Check your email',
          description: `We've sent you a confirmation link at ${email ? `**${email}**` : 'your email address'}. Click the link to verify your account.`
        }
    }
  }

  const status = getStatusMessage()

  return (
    <div className="min-h-screen flex items-center justify-center font-sans bg-secondary">
      <div className="max-w-md w-full p-10 bg-background rounded-xl text-center border border-border">
        {/* Status Icon */}
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>
          {getStatusIcon()}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-brand-primary mb-3">
          {status.title}
        </h2>

        {/* Description */}
        <p className="text-base text-brand-text mb-8 leading-relaxed">
          {status.description.includes('**') ? (
            <>
              {status.description.split('**')[0]}
              <strong>{status.description.split('**')[1]}</strong>
              {status.description.split('**')[2]}
            </>
          ) : (
            status.description
          )}
        </p>

        {/* Success message */}
        {resendMessage && (
          <div className="mb-6 p-3 bg-success/10 border border-success rounded-lg">
            <p className="text-sm text-success">
              {resendMessage}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-3 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">
              {error}
            </p>
          </div>
        )}

        {/* Action buttons */}
        {verificationStatus === 'verified' ? (
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 px-6 bg-success text-success-foreground border-none rounded-lg text-base font-semibold cursor-pointer hover:opacity-90 transition-opacity mb-4"
          >
            Go to Dashboard
          </button>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 px-6 bg-brand-primary text-white border-none rounded-lg text-base font-semibold cursor-pointer hover:opacity-90 transition-opacity"
          >
            Back to Sign In
          </button>
        )}

        {/* Help text */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Didn't receive an email? Check your spam folder or{' '}
            {email && canResend && !isResending ? (
              <button
                onClick={handleResendEmail}
                className="text-brand-primary hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit"
              >
                try resending
              </button>
            ) : (
              'try resending above'
            )}
            .
          </p>
        </div>
      </div>
    </div>
  )
}