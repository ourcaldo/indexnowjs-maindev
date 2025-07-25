import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ActivityLogger, ActivityEventTypes } from '@/lib/activity-logger'
import { logger } from '@/lib/error-handling'

export async function POST(request: NextRequest) {
  try {
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

    // Get current session before logout for activity logging
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id

    // Perform logout
    const { error } = await supabase.auth.signOut()

    if (error) {
      logger.error({ error: error.message }, 'Logout failed')
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log successful logout activity
    if (userId) {
      try {
        await ActivityLogger.logAuth(
          userId,
          ActivityEventTypes.LOGOUT,
          true,
          request
        )
      } catch (logError) {
        logger.error({ error: logError, userId }, 'Failed to log logout activity')
      }
    }

    // Clear all auth cookies
    cookieStore.delete('sb-access-token')
    cookieStore.delete('sb-refresh-token')

    logger.info({ userId }, 'User logged out successfully')

    return NextResponse.json({ 
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error: any) {
    logger.error({ error: error.message }, 'Exception during logout')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}