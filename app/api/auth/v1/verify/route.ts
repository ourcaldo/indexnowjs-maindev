import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Supabase Email Verification Route
 * Handles verification URLs from Supabase with different types:
 * - type=signup: Email confirmation for new registration
 * - type=recovery: Password reset verification  
 * - type=magiclink: Magic link authentication
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token = searchParams.get('token_hash') ?? searchParams.get('token')
  const type = searchParams.get('type')
  const rawRedirectTo = searchParams.get('redirect_to') ?? '/dashboard'
  // Ensure redirect URL is a safe path (starts with /) to prevent open redirects
  const redirectTo = rawRedirectTo.startsWith('/') ? rawRedirectTo : '/dashboard'

  // Validate required parameters
  if (!token) {
    console.error('Verification error: Missing token parameter')
    return NextResponse.redirect(`${origin}/login?error=missing_verification_token`)
  }

  if (!type) {
    console.error('Verification error: Missing type parameter')  
    return NextResponse.redirect(`${origin}/login?error=missing_verification_type`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    // Handle different verification types
    switch (type) {
      case 'signup': {
        // Handle email confirmation for new registration
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        })
        
        if (error) {
          console.error('Email verification error:', error)
          return NextResponse.redirect(`${origin}/login?error=email_verification_failed`)
        }

        // Successful email verification - redirect to dashboard
        console.log('Email verification successful for signup')
        return NextResponse.redirect(`${origin}/dashboard?message=email_verified`)
      }

      case 'recovery': {
        // Handle password reset verification
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'recovery'
        })
        
        if (error) {
          console.error('Password recovery verification error:', error)
          return NextResponse.redirect(`${origin}/login?error=recovery_verification_failed`)
        }

        // Successful password reset verification - redirect to reset password page
        // Note: Recovery session is now established, no need to pass token in query
        console.log('Password recovery verification successful')
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      case 'magiclink': {
        // Handle magic link authentication
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'magiclink'
        })
        
        if (error) {
          console.error('Magic link verification error:', error)
          return NextResponse.redirect(`${origin}/login?error=magiclink_verification_failed`)
        }

        // Successful magic link authentication - redirect to requested page or dashboard
        console.log('Magic link verification successful')
        return NextResponse.redirect(`${origin}${redirectTo}`)
      }

      default: {
        console.error('Verification error: Unknown verification type:', type)
        return NextResponse.redirect(`${origin}/login?error=unknown_verification_type`)
      }
    }
  } catch (error) {
    console.error('Verification exception:', error)
    return NextResponse.redirect(`${origin}/login?error=verification_exception`)
  }
}