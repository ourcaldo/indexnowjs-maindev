/**
 * Error Statistics API Endpoint
 * Provides error tracking statistics and analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthUser } from '@/lib/server-auth'
import { errorTracker } from '@/lib/error-tracker'
import { z } from 'zod'

const errorQuerySchema = z.object({
  days: z.string().optional().default('30'),
  user_id: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getServerAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryValidation = errorQuerySchema.safeParse({
      days: searchParams.get('days') || '30',
      user_id: searchParams.get('user_id') || undefined
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      )
    }

    const { days, user_id } = queryValidation.data
    const daysNumber = parseInt(days, 10)

    if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
      return NextResponse.json(
        { success: false, error: 'Days parameter must be between 1 and 365' },
        { status: 400 }
      )
    }

    // 3. Calculate date range
    const endDate = new Date()
    const startDate = new Date(Date.now() - daysNumber * 24 * 60 * 60 * 1000)

    // 4. Get error statistics
    let errorStats
    if (user_id) {
      // Get user-specific stats
      errorStats = await errorTracker.getErrorStats(user_id, { start: startDate, end: endDate })
    } else {
      // Get system-wide stats
      const systemStats = await errorTracker.getSystemErrorStats({ start: startDate, end: endDate })
      errorStats = systemStats
    }

    return NextResponse.json({
      success: true,
      data: errorStats,
      meta: {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: daysNumber
        },
        scope: user_id ? 'user' : 'system'
      }
    })

  } catch (error) {
    console.error('Error getting error statistics:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}