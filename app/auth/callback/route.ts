import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Enhanced Auth Callback Route for Supabase Authentication
 * Handles redirects from Supabase after authentication flows including:
 * - Magic link authentication
 * - Email verification confirmations
 * - Password reset flows
 * - OAuth provider callbacks
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'
  // Ensure redirect URL is a safe path (starts with /) to prevent open redirects
  const next = rawNext.startsWith('/') ? rawNext : '/dashboard'
  const error_code = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Handle Supabase auth errors first
  if (error_code) {
    console.error('Supabase auth error:', { error_code, error_description })
    
    // Map specific Supabase errors to user-friendly messages
    switch (error_code) {
      case 'access_denied':
        return NextResponse.redirect(`${origin}/login?error=access_denied`)
      case 'server_error':
        return NextResponse.redirect(`${origin}/login?error=server_error`)
      case 'temporarily_unavailable':
        return NextResponse.redirect(`${origin}/login?error=temporarily_unavailable`)
      default:
        return NextResponse.redirect(`${origin}/login?error=auth_error&details=${encodeURIComponent(error_description || 'Unknown error')}`)
    }
  }

  // Handle successful authentication with code
  if (code) {
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
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        
        // Enhanced error handling with specific error types
        if (error.message?.includes('expired')) {
          return NextResponse.redirect(`${origin}/login?error=expired_link`)
        } else if (error.message?.includes('invalid')) {
          return NextResponse.redirect(`${origin}/login?error=invalid_link`)
        } else {
          return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
        }
      }

      // Verify we have a valid session and user
      if (!data.session || !data.user) {
        console.error('Auth callback error: No session or user data received')
        return NextResponse.redirect(`${origin}/login?error=no_session_data`)
      }

      // Log successful authentication
      console.log('Successful authentication callback for user:', data.user.id)

      // For email verification, check if this was an unconfirmed user
      if (!data.user.email_confirmed_at && data.session) {
        // This shouldn't happen with proper verification, but handle gracefully
        console.warn('User session created but email not confirmed:', data.user.id)
      }

      // Successful authentication - redirect to requested page or dashboard
      const redirectUrl = `${origin}${next}`
      console.log('Redirecting authenticated user to:', redirectUrl)
      return NextResponse.redirect(redirectUrl)
      
    } catch (error) {
      console.error('Auth callback exception:', error)
      
      // More specific error handling for exceptions
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          return NextResponse.redirect(`${origin}/login?error=network_error`)
        } else if (error.message.includes('timeout')) {
          return NextResponse.redirect(`${origin}/login?error=timeout_error`)
        }
      }
      
      return NextResponse.redirect(`${origin}/login?error=auth_callback_exception`)
    }
  }

  // If no code or error present, this is an invalid callback
  console.error('Auth callback error: Missing required parameters (code or error)')
  return NextResponse.redirect(`${origin}/login?error=missing_auth_code`)
}