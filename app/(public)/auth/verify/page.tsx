'use client'

import { useRouter } from "next/navigation"
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'

export default function VerifyEmail() {
  const router = useRouter()
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(true) // Always use full logo for verify page
  useFavicon() // Automatically updates favicon

  // Get email from URL search params
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const email = urlParams?.get('email') || ''

  return (
    <div className="min-h-screen flex items-center justify-center font-sans bg-secondary">
      <div className="max-w-md w-full p-10 bg-background rounded-xl text-center border border-border">
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>✨</div>
        <h2 className="text-2xl font-bold text-brand-primary mb-3">
          Check your email
        </h2>
        <p className="text-base text-brand-text mb-8 leading-relaxed">
          We've sent you a confirmation link at <strong>{email}</strong>. Click the link to verify your account.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="w-full py-3 px-6 bg-brand-primary text-white border-none rounded-lg text-base font-semibold cursor-pointer hover:opacity-90 transition-opacity"
        >
          Back to Sign In
        </button>
      </div>
    </div>
  )
}