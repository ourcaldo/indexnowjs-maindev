import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ActivityLogger } from '@/lib/monitoring'
import { logger } from '@/lib/monitoring/error-handling'

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

      // Send login notification email for session restoration (fire-and-forget)
      process.nextTick(async () => {
        try {
          const { LoginNotificationService } = await import('@/lib/email/login-notification-service')
          const { getRequestInfo } = await import('@/lib/utils/ip-device-utils')
          
          // Extract request information for notification
          const requestInfo = await getRequestInfo(request)
          
          // Send notification asynchronously with timeout protection
          Promise.race([
            LoginNotificationService.getInstance().sendLoginNotification({
              userId: data.session.user.id,
              userEmail: data.session.user.email || '',
              userName: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0] || 'User',
              ipAddress: requestInfo.ipAddress || 'Unknown',
              userAgent: requestInfo.userAgent || 'Unknown',
              deviceInfo: requestInfo.deviceInfo || undefined,
              locationData: requestInfo.locationData || undefined,
              loginTime: new Date().toISOString()
            }),
            // Timeout after 30 seconds
            new Promise((_, reject) => setTimeout(() => reject(new Error('Email sending timeout')), 30000))
          ]).then(() => {
            logger.info({ userId: data.session.user.id }, 'Session restoration login notification email sent successfully')
          }).catch((notificationError) => {
            logger.error({ error: notificationError, userId: data.session.user.id }, 'Failed to send session login notification email')
          })
          
        } catch (importError) {
          logger.error({ error: importError, userId: data.session.user.id }, 'Failed to initialize session login notification service')
        }
      })

    } catch (logError) {
      logger.error({ error: logError, userId: data.session.user.id }, 'Failed to log session activity')
    }
  }

  return NextResponse.json({ success: true })
}