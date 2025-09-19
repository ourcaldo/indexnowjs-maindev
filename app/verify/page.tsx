'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'
import { authService } from '@/lib/auth'
import DashboardPreview from '@/components/DashboardPreview'

export default function VerifyEmail() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [gotoUrl, setGotoUrl] = useState('/dashboard')
  const [canResend, setCanResend] = useState(true)
  const [countdown, setCountdown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [error, setError] = useState('')
  const [isCheckingVerification, setIsCheckingVerification] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'checking' | 'verified' | 'expired'>('pending')
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(true)
  useFavicon()

  // Check mobile screen size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  // Helper function to validate and sanitize goto URL
  const sanitizeGotoUrl = (gotoParam: string | null): string => {
    if (!gotoParam) return '/dashboard'
    
    // Only allow relative internal paths starting with '/'
    if (!gotoParam.startsWith('/')) return '/dashboard'
    
    // Prevent protocol-relative URLs (//evil.com)
    if (gotoParam.startsWith('//')) return '/dashboard'
    
    // Basic validation - must be a relative path
    try {
      const url = new URL(gotoParam, window.location.origin)
      // Ensure it's the same origin
      if (url.origin !== window.location.origin) return '/dashboard'
      return url.pathname + url.search + url.hash
    } catch {
      return '/dashboard'
    }
  }

  // Authentication and access control check
  useEffect(() => {
    const checkAuthAndAccess = async () => {
      try {
        setIsLoading(true)
        const currentUser = await authService.getCurrentUser()
        
        // Get and sanitize goto parameter
        const urlParams = new URLSearchParams(window.location.search)
        const gotoParam = urlParams.get('goto')
        const safeGotoUrl = sanitizeGotoUrl(gotoParam)
        
        // If not logged in, redirect to login with return path
        if (!currentUser) {
          router.push(`/login?goto=${encodeURIComponent(`/verify?goto=${encodeURIComponent(safeGotoUrl)}`)}`) 
          return
        }
        
        // If already verified, redirect to destination
        if (currentUser.emailVerification) {
          router.push(safeGotoUrl)
          return
        }
        
        // User is logged in but not verified - show verify page
        setUser(currentUser)
        setEmail(currentUser.email || '')
        setGotoUrl(safeGotoUrl)
        
      } catch (error) {
        console.error('Auth check error:', error)
        // Redirect to login on any auth error
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndAccess()
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
    if (!user || !email) return

    const checkVerificationStatus = async () => {
      try {
        setIsCheckingVerification(true)
        const currentUser = await authService.getCurrentUser()
        
        if (currentUser?.emailVerification) {
          setVerificationStatus('verified')
          // Redirect to destination after a brief delay
          setTimeout(() => {
            // Safely build URL with query parameter
            const url = new URL(gotoUrl, window.location.origin)
            url.searchParams.set('message', 'email_verified')
            router.push(url.pathname + url.search + url.hash)
          }, 2000)
        }
      } catch (error) {
        console.error('Verification check error:', error)
      } finally {
        setIsCheckingVerification(false)
      }
    }

    // Check immediately
    checkVerificationStatus()

    // Set up polling every 5 seconds
    const pollInterval = setInterval(checkVerificationStatus, 5000)

    return () => clearInterval(pollInterval)
  }, [user, email, router, gotoUrl])

  const handleResendEmail = async () => {
    if (!user || !email) {
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
        setCountdown(data.canResendAfter || 60)
      } else if (response.status === 429) {
        setError(data.error || 'Too many requests. Please try again later.')
        setCanResend(false)
        setCountdown(data.retryAfter || 300)
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
          description: 'Your email has been successfully verified. Redirecting...'
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
          title: 'Verify your email address to continue',
          description: `We sent an email to ${email ? `**${email}**` : 'your email address'}. Click the link in that email to verify your account.`
        }
    }
  }

  const status = getStatusMessage()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex ${isMobile ? 'flex-col' : 'flex-row'} font-sans`}>
      {/* Left Side - Verification Form */}
      <div className={`${isMobile ? 'w-full' : 'w-1/2'} bg-background ${isMobile ? 'px-5 py-10' : 'p-[60px]'} flex flex-col justify-center ${isMobile ? 'items-center' : 'items-start'} relative`}>
        {/* Logo */}
        {logoUrl && (
          <div className={`absolute ${isMobile ? 'top-5 left-5' : 'top-10 left-[60px]'} flex items-center`}>
            <img 
              src={logoUrl} 
              alt="Logo"
              style={{
                height: isMobile ? '48px' : '72px',
                width: 'auto',
                maxWidth: isMobile ? '240px' : '360px'
              }}
            />
          </div>
        )}

        {/* Main Content */}
        <div className={`max-w-md w-full ${isMobile ? 'text-center mt-24' : 'text-left'}`}>
          {/* Status Icon */}
          <div className={`${isMobile ? 'text-center' : 'text-left'} mb-6`}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>
              {getStatusIcon()}
            </div>
          </div>

          {/* Title */}
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-brand-primary mb-2 leading-tight`}>
            {status.title}
          </h1>

          {/* Description */}
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground mb-8 leading-relaxed`}>
            {status.description.includes('**') ? (
              <>
                {status.description.split('**')[0]}
                <strong className="text-foreground">{status.description.split('**')[1]}</strong>
                {status.description.split('**')[2]}
              </>
            ) : (
              status.description
            )}
          </p>

          {/* Success message */}
          {resendMessage && (
            <div className="mb-6 p-4 bg-success/10 border border-success rounded-lg">
              <p className="text-sm text-success font-medium">
                {resendMessage}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive font-medium">
                {error}
              </p>
            </div>
          )}

          {/* Resend Email Button */}
          {verificationStatus !== 'verified' && (
            <div className="mb-8">
              <button
                onClick={handleResendEmail}
                disabled={!canResend || isResending}
                className="w-full py-[14px] px-6 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg text-base font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isResending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Sending...
                  </>
                ) : canResend ? (
                  '📧 Resend email'
                ) : (
                  `Resend in ${countdown}s`
                )}
              </button>
            </div>
          )}

          {/* Action buttons */}
          {verificationStatus === 'verified' ? (
            <button
              onClick={() => router.push(gotoUrl)}
              className="w-full py-[14px] px-6 bg-success text-success-foreground rounded-lg text-base font-semibold cursor-pointer hover:opacity-90 transition-opacity mb-4"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="w-full py-[14px] px-6 bg-brand-primary text-white rounded-lg text-base font-semibold cursor-pointer hover:bg-brand-secondary transition-colors"
            >
              Back to Sign In
            </button>
          )}

          {/* Help text */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Don't see an email? Check your spam or other filtered folders.
            </p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              If you are not able to verify,{' '}
              <button
                onClick={() => {
                  // Log out and redirect to login
                  authService.signOut().then(() => {
                    router.push('/login')
                  })
                }}
                className="text-brand-primary hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit"
              >
                click here to log out
              </button>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Dashboard Preview (Desktop Only) */}
      {!isMobile && (
        <div className="w-1/2 bg-brand-primary p-[60px] flex flex-col justify-center items-center text-white relative">
          <div className="overflow-hidden w-full h-full relative">
            <DashboardPreview />
          </div>
        </div>
      )}
    </div>
  )
}