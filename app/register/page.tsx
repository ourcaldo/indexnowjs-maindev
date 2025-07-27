
'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth"
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'

// import DashboardPreview from '../components/DashboardPreview'

export default function Register() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(true) // Always use full logo for register page
  useFavicon() // Automatically updates favicon

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      await authService.signUp(email, password, name)
      setSuccess(true)
    } catch (error: any) {
      setError(error.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#f7f9fc'
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          padding: '40px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          textAlign: 'center',
          border: '1px solid #e0e6ed'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✨</div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1a1a1a',
            marginBottom: '12px'
          }}>
            Check your email
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#6c757d',
            marginBottom: '32px',
            lineHeight: '1.5'
          }}>
            We've sent you a confirmation link at <strong>{email}</strong>. Click the link to verify your account.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

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
          padding: '40px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: '#ffffff',
          position: 'relative'
        }}>
          {/* Mobile Logo on left side */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${siteName} Logo`}
                style={{
                  height: '54px',
                  width: 'auto',
                  maxWidth: '270px',
                  filter: 'brightness(0) invert(1)' // Make logo white for dark background
                }}
              />
            ) : (
              <span style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#ffffff'
              }}>
                {siteName}
              </span>
            )}
          </div>
          
          <div style={{
            padding: '40px',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '16px'
            }}>
              Join thousands of developers getting results.
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.5'
            }}>
              Create your account and start indexing your URLs instantly with powerful analytics.
            </p>
          </div>
        </div>
      )}

      {/* Left Side - Register Form */}
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
        {!isMobile && (
          <div style={{
            position: 'absolute',
            top: '40px',
            left: '60px',
            display: 'flex',
            alignItems: 'center'
          }}>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${siteName} Logo`}
                style={{
                  height: '72px',
                  width: 'auto',
                  maxWidth: '360px'
                }}
              />
            ) : (
              <span style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1a1a1a'
              }}>
                {siteName}
              </span>
            )}
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
            Create Account
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '40px',
            lineHeight: '1.5'
          }}>
            Join {siteName} to start indexing your URLs instantly.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Name Field */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                placeholder="Enter your full name"
                required
              />
            </div>

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
                placeholder="you@company.com"
                required
              />
            </div>

            {/* Password Field */}
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
                  placeholder="Create a password"
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
                    padding: '4px'
                  }}
                >
                  👁
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                    padding: '4px'
                  }}
                >
                  👁
                </button>
              </div>
            </div>

            {/* Register Button */}
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
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>

            {/* Error Message */}
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '24px'
              }}>
                <p style={{
                  color: '#dc2626',
                  fontSize: '14px',
                  margin: '0'
                }}>
                  {error}
                </p>
              </div>
            )}

            {/* Or Register With */}
            <div style={{
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <span style={{
                fontSize: '14px',
                color: '#9ca3af'
              }}>
                Or Use Magic Link
              </span>
            </div>

            {/* Magic Link Button */}
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
                  alert("Magic link sent to your email!")
                } catch (error: any) {
                  setError(error.message || "Failed to send magic link")
                } finally {
                  setIsLoading(false)
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                marginBottom: '32px'
              }}
            >
              <span style={{ marginRight: '8px' }}>✨</span>
              Send Magic Link
            </button>

            {/* Sign In Link */}
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: '14px',
                color: '#6b7280'
              }}>
                Already Have An Account?{' '}
              </span>
              <button
                type="button"
                onClick={() => router.push("/")}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1a1a1a',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.textDecoration = 'underline'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.textDecoration = 'none'}
              >
                Sign In Instead.
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Desktop: Right Side - Feature Showcase */}
      {!isMobile && (
        <div style={{
          width: '50%',
          backgroundColor: '#1a1a1a',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: '#ffffff',
          position: 'relative'
        }}>
          <div style={{
            padding: '40px',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '16px'
            }}>
              Join thousands of developers getting results.
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.5'
            }}>
              Create your account and start indexing your URLs instantly with powerful analytics.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
