
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
        backgroundColor: 'var(--background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: 'hsl(var(--success))',
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
            color: 'var(--brand-primary)',
            marginBottom: '16px'
          }}>
            Check Your Email
          </h1>
          <p style={{
            color: 'var(--brand-text)',
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
              backgroundColor: 'var(--brand-primary)',
              color: 'var(--background)',
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
          backgroundColor: 'var(--brand-primary)',
          padding: '40px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: 'var(--background)',
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
              color: 'var(--background)'
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
              color: 'var(--background)',
              marginBottom: '16px'
            }}>
              Get back to your indexing dashboard.
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'hsl(var(--background) / 0.8)',
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
        backgroundColor: 'var(--background)',
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
              color: 'var(--brand-primary)'
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
            color: 'var(--brand-primary)',
            marginBottom: '8px',
            lineHeight: '1.2'
          }}>
            Forgot Password?
          </h1>
          <p style={{
            fontSize: '16px',
            color: 'var(--brand-text)',
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
                color: 'var(--foreground)',
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
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  backgroundColor: 'var(--background)',
                  color: 'hsl(var(--foreground))',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--brand-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'hsl(var(--border))'}
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
                backgroundColor: 'var(--brand-primary)',
                color: 'var(--background)',
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
                backgroundColor: 'hsl(var(--destructive) / 0.1)',
                border: '1px solid hsl(var(--destructive) / 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '24px'
              }}>
                <p style={{
                  color: 'hsl(var(--destructive))',
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
                  color: 'var(--brand-primary)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.textDecoration = 'underline'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.textDecoration = 'none'}
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
          backgroundColor: 'var(--brand-primary)',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: 'var(--background)',
          position: 'relative'
        }}>
          <div style={{
            padding: '40px',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: 'var(--background)',
              marginBottom: '16px'
            }}>
              Get back to your indexing dashboard.
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'hsl(var(--background) / 0.8)',
              lineHeight: '1.5'
            }}>
              Your analytics and performance data are waiting for you to return.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
