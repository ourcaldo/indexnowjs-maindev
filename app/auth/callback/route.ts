import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Auth Callback Route for Supabase Magic Link Authentication
 * Handles the redirect from Supabase after magic link click
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()
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
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        // Redirect to login with error
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
      }

      // Successful authentication - redirect to dashboard
      return NextResponse.redirect(`${origin}${next}`)
    } catch (error) {
      console.error('Auth callback exception:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_callback_exception`)
    }
  }

  // If no code present, redirect to login
  return NextResponse.redirect(`${origin}/login?error=missing_auth_code`)
}