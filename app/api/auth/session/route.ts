import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ActivityLogger } from '@/lib/activity-logger'
import { logger } from '@/lib/error-handling'

export async function GET(request: NextRequest) {
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

  const { data: { session } } = await supabase.auth.getSession()
  
  return NextResponse.json({
    hasSession: !!session,
    user: session?.user ? {
      id: session.user.id,
      email: session.user.email
    } : null
  })
}

export async function POST(request: NextRequest) {
  const { access_token, refresh_token } = await request.json()
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

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token
  })

  if (error) {
    logger.error({ error: error.message }, 'Failed to set session')
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Log session activity if user is available
  if (data.session?.user?.id) {
    try {
      await ActivityLogger.logUserDashboardActivity(
        data.session.user.id,
        'Session established',
        'User session restored from stored tokens',
        request
      )
    } catch (logError) {
      logger.error({ error: logError, userId: data.session.user.id }, 'Failed to log session activity')
    }
  }

  return NextResponse.json({ success: true })
}