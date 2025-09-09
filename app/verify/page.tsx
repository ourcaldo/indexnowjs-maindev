'use client'

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'

export default function VerifyEmail() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(true) // Always use full logo for verify page
  useFavicon() // Automatically updates favicon

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams?.get('email')
    if (emailParam) {
      setEmail(emailParam)
    } else {
      // Fallback to localStorage if available
      const storedEmail = localStorage.getItem('pendingVerificationEmail')
      if (storedEmail) {
        setEmail(storedEmail)
        localStorage.removeItem('pendingVerificationEmail') // Clean up
      }
    }
  }, [searchParams])

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
          We've sent you a confirmation link at {email && <strong>{email}</strong>}. Click the link to verify your account.
        </p>
        <button
          onClick={() => router.push('/login')}
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