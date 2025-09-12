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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Mobile: Show dashboard preview first */}
      {isMobile && (
        <div style={{
          backgroundColor: '#1a1a1a',
          padding: '80px 20px 40px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: '#ffffff',
          position: 'relative'
        }}>
          {/* Mobile Logo on left side */}
          {logoUrl && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <img 
                src={logoUrl} 
                alt="Logo"
                style={{
                  height: '36px',
                  width: 'auto',
                  maxWidth: '180px'
                }}
              />
            </div>
          )}
          
          <div style={{ 
            overflow: 'hidden', 
            width: '100%',
            position: 'relative'
          }}>
            <DashboardPreview 
              variant="login"
            />
          </div>
        </div>
      )}

      {/* Left Side - Login Form */}
      <div style={{
        width: isMobile ? '100%' : '50%',
        backgroundColor: '#ffffff',
        padding: isMobile ? '40px 20px' : '60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: isMobile ? 'center' : 'flex-start',
        position: 'relative'
      }}>
        {/* Desktop Logo on left side */}
        {!isMobile && logoUrl && (
          <div style={{
            position: 'absolute',
            top: '40px',
            left: '60px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <img 
              src={logoUrl} 
              alt="Logo"
              style={{
                height: '72px',
                width: 'auto',
                maxWidth: '360px'
              }}
            />
          </div>
        )}

        {/* Main Content */}
        <div style={{ 
          maxWidth: '400px', 
          width: '100%',
          textAlign: isMobile ? 'center' : 'left'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#1a1a1a',
            marginBottom: '8px',
            lineHeight: '1.2'
          }}>
            Welcome Back
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '40px',
            lineHeight: '1.5'
          }}>
            Enter your email and password to access your account.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Magic Link Success Notification */}
            {magicLinkSent && (
              <div style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '32px',
                textAlign: 'center'
              }}>
                <div style={{ marginBottom: '16px', fontSize: '32px' }}>✨</div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#0f172a',
                  marginBottom: '8px',
                  margin: '0 0 8px 0'
                }}>
                  Magic Link Sent!
                </h3>
                <p style={{
                  color: '#64748b',
                  fontSize: '14px',
                  margin: '0',
                  lineHeight: '1.5'
                }}>
                  Check your email ({email}) and click the link to log in instantly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMagicLinkSent(false)
                    setIsMagicLinkMode(false)
                  }}
                  style={{
                    marginTop: '16px',
                    background: 'none',
                    border: 'none',
                    color: '#0ea5e9',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Back to login
                </button>
              </div>
            )}

            {/* Show form only if magic link is not sent */}
            {!magicLinkSent && (
              <>
                {/* Email Field */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      color: '#1f2937',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1a1a1a'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                {/* Password Field - Hidden in magic link mode */}
                {!isMagicLinkMode && (
                  <>
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            paddingRight: '48px',
                            fontSize: '16px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            color: '#1f2937',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
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
        <div style={{
          width: '50%',
          backgroundColor: '#1a1a1a',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#ffffff',
          position: 'relative'
        }}>
          <div style={{ 
            overflow: 'hidden', 
            width: '100%', 
            height: '100%',
            position: 'relative'
          }}>
            <DashboardPreview 
              variant="login"
            />
          </div>
        </div>
      )}
    </div>
  )
}