
'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth"

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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
    
    try {
      await authService.resetPassword(email)
      setSuccess(true)
    } catch (error: any) {
      setError(error.message || "Failed to send recovery email")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: '#059669',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '24px'
          }}>
            ✓
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1a1a1a',
            marginBottom: '16px'
          }}>
            Check Your Email
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            marginBottom: '32px',
            lineHeight: '1.5'
          }}>
            We've sent a password recovery link to {email}
          </p>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Back to Login
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
            <span style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#ffffff'
            }}>
              IndexNow
            </span>
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
              Get back to your indexing dashboard.
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.5'
            }}>
              Your analytics and performance data are waiting for you to return.
            </p>
          </div>
        </div>
      )}

      {/* Left Side - Forgot Password Form */}
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
            <span style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              IndexNow
            </span>
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
            Forgot Password?
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '40px',
            lineHeight: '1.5'
          }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: '32px' }}>
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

            {/* Submit Button */}
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
              {isLoading ? "Sending..." : "Send Recovery Email"}
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

            {/* Back to Login */}
            <div style={{ textAlign: 'center' }}>
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
                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
              >
                ← Back to Login
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
          <DashboardPreview 
            title="Get back to your indexing dashboard."
            subtitle="Your analytics and performance data are waiting for you to return."
            variant="forgot"
          />
        </div>
      )}
    </div>
  )
}
