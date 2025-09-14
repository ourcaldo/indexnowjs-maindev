'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth"
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'

import DashboardPreview from '@/components/DashboardPreview'

export default function Login() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isMagicLinkMode, setIsMagicLinkMode] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(true) // Always use full logo for login page
  useFavicon() // Automatically updates favicon

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    
    try {
      await authService.signIn(email, password)
      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message || "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.")
      return
    }
    
    setIsLoading(true)
    try {
      await authService.resetPassword(email)
      alert("Password recovery email sent!")
    } catch (error: any) {
      setError(error.message || "Failed to send recovery email")
    } finally {
      setIsLoading(false)
    }
  }

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  return (
    <div className={`min-h-screen flex ${isMobile ? 'flex-col' : 'flex-row'} font-sans`}>

      {/* Left Side - Login Form */}
      <div className={`${isMobile ? 'w-full' : 'w-1/2'} bg-background ${isMobile ? 'px-5 py-10' : 'p-[60px]'} flex flex-col justify-center ${isMobile ? 'items-center' : 'items-start'} relative`}>
        {/* Logo for both mobile and desktop */}
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
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-brand-primary mb-2 leading-tight`}>
            Welcome Back
          </h1>
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground mb-10 leading-relaxed`}>
            Enter your email and password to access your account.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Magic Link Success Notification */}
            {magicLinkSent && (
              <div className="bg-info/10 border border-info rounded-xl p-5 mb-8 text-center">
                <div style={{ marginBottom: '16px', fontSize: '32px' }}>✨</div>
                <h3 className="text-lg font-semibold text-foreground mb-2 m-0">
                  Magic Link Sent!
                </h3>
                <p className="text-muted-foreground text-sm m-0 leading-relaxed">
                  Check your email ({email}) and click the link to log in instantly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMagicLinkSent(false)
                    setIsMagicLinkMode(false)
                  }}
                  className="mt-4 bg-transparent border-none text-info text-sm cursor-pointer underline"
                >
                  Back to login
                </button>
              </div>
            )}

            {/* Show form only if magic link is not sent */}
            {!magicLinkSent && (
              <>
                {/* Email Field */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-background text-gray-800 outline-none transition-colors duration-200 focus:border-brand-primary"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                {/* Password Field - Hidden in magic link mode */}
                {!isMagicLinkMode && (
                  <>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-12 text-base border border-gray-300 rounded-lg bg-background text-gray-800 outline-none transition-colors duration-200 focus:border-brand-primary"
                          onFocus={(e) => e.target.style.borderColor = '#1a1a1a'}
                          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          placeholder="Your password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showPassword ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '32px'
                    }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          style={{
                            marginRight: '8px',
                            width: '16px',
                            height: '16px'
                          }}
                        />
                        <span style={{
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          Remember Me
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => router.push("/forgot-password")}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1a1a1a',
                          fontSize: '14px',
                          cursor: 'pointer',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => (e.target as HTMLButtonElement).style.textDecoration = 'underline'}
                        onMouseLeave={(e) => (e.target as HTMLButtonElement).style.textDecoration = 'none'}
                      >
                        Forgot Your Password?
                      </button>
                    </div>
                  </>
                )}

                {/* Login/Magic Link Button */}
                {isMagicLinkMode ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        setError("Please enter your email address first.")
                        return
                      }
                      setIsLoading(true)
                      try {
                        await authService.createMagicLink(email, `${window.location.origin}/dashboard`)
                        setMagicLinkSent(true)
                        setError("")
                      } catch (error: any) {
                        setError(error.message || "Failed to send magic link")
                      } finally {
                        setIsLoading(false)
                      }
                    }}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '14px 24px',
                      backgroundColor: '#0ea5e9',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      marginBottom: '24px',
                      opacity: isLoading ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span style={{ marginRight: '8px' }}>✨</span>
                    {isLoading ? "Sending..." : "Send Magic Link"}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '14px 24px',
                      backgroundColor: '#1a1a1a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      marginBottom: '24px',
                      opacity: isLoading ? 0.7 : 1
                    }}
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </button>
                )}

                {/* Error Message */}
                {error && (
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '24px',
                    color: '#dc2626',
                    fontSize: '14px',
                    textAlign: 'center'
                  }}>
                    {error}
                  </div>
                )}

                {/* Toggle Magic Link Mode */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <button
                    type="button"
                    onClick={() => setIsMagicLinkMode(!isMagicLinkMode)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.textDecoration = 'underline'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.textDecoration = 'none'}
                  >
                    {isMagicLinkMode ? "← Back to password login" : "✨ Login with magic link instead"}
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Register Link */}
          <div style={{
            textAlign: 'center',
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0'
            }}>
              Don't have an account?{' '}
              <button
                onClick={() => router.push("/register")}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1a1a1a',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => (e.target as HTMLButtonElement).style.textDecoration = 'underline'}
                onMouseLeave={(e) => (e.target as HTMLButtonElement).style.textDecoration = 'none'}
              >
                Sign up here
              </button>
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