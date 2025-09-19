import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Resend Email Verification API Route
 * Handles resending verification emails with robust rate limiting and security
 */

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number; lastRequest: number }>()

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_ATTEMPTS: 3, // Maximum attempts per window
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes window
  COOLDOWN_MS: 60 * 1000, // 60 seconds between requests
}

function checkRateLimit(email: string, clientIP: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const emailKey = `resend_email_${email.toLowerCase()}`
  const ipKey = `resend_ip_${clientIP}`
  
  // Check both email and IP rate limits
  const emailRecord = rateLimitStore.get(emailKey)
  const ipRecord = rateLimitStore.get(ipKey)

  // Clean up expired records
  if (emailRecord && now > emailRecord.resetTime) {
    rateLimitStore.delete(emailKey)
  }
  if (ipRecord && now > ipRecord.resetTime) {
    rateLimitStore.delete(ipKey)
  }

  const currentEmailRecord = rateLimitStore.get(emailKey)
  const currentIPRecord = rateLimitStore.get(ipKey)

  // Check cooldown period (60 seconds between requests)
  if (currentEmailRecord && (now - currentEmailRecord.lastRequest) < RATE_LIMIT.COOLDOWN_MS) {
    const retryAfter = Math.ceil((RATE_LIMIT.COOLDOWN_MS - (now - currentEmailRecord.lastRequest)) / 1000)
    return { allowed: false, retryAfter }
  }

  // Check IP rate limit (prevent spamming different emails from same IP)
  if (currentIPRecord && currentIPRecord.count >= RATE_LIMIT.MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((currentIPRecord.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // Check email rate limit
  if (currentEmailRecord && currentEmailRecord.count >= RATE_LIMIT.MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((currentEmailRecord.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // Update rate limit records
  const emailCount = currentEmailRecord ? currentEmailRecord.count + 1 : 1
  const ipCount = currentIPRecord ? currentIPRecord.count + 1 : 1

  rateLimitStore.set(emailKey, {
    count: emailCount,
    resetTime: currentEmailRecord?.resetTime || (now + RATE_LIMIT.WINDOW_MS),
    lastRequest: now
  })

  rateLimitStore.set(ipKey, {
    count: ipCount,
    resetTime: currentIPRecord?.resetTime || (now + RATE_LIMIT.WINDOW_MS),
    lastRequest: now
  })

  return { allowed: true }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { email } = body

    // Validate email parameter
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      )
    }

    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    request.headers.get('cf-connecting-ip') || 
                    '127.0.0.1'

    // Check rate limiting (both email and IP based)
    const rateCheck = checkRateLimit(email, clientIP)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: rateCheck.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateCheck.retryAfter?.toString() || '900'
          }
        }
      )
    }

    // Create simple Supabase client (no cookies needed for auth.resend)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Always attempt to resend verification email
    // Don't check if user exists or verification status to prevent enumeration
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/auth/v1/verify`
      }
    })

    if (resendError) {
      // Handle specific Supabase errors
      if (resendError.message?.includes('rate limit') || resendError.message?.includes('too_many_requests')) {
        return NextResponse.json(
          { 
            error: 'Email sending rate limit exceeded. Please try again in a few minutes.',
            retryAfter: 300 // 5 minutes
          },
          { 
            status: 429,
            headers: {
              'Retry-After': '300'
            }
          }
        )
      }

      // For all other errors (including "not found" or "already verified"),
      // return generic success message to prevent enumeration
      console.warn('Resend verification error (hidden from user):', resendError.message)
    }

    // Always return success message regardless of actual result
    // This prevents enumeration of email addresses and verification status
    return NextResponse.json(
      { 
        message: 'If an account with this email exists and is unverified, a verification email has been sent.',
        canResendAfter: RATE_LIMIT.COOLDOWN_MS / 1000 // Return cooldown in seconds
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Resend verification exception:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}