/**
 * Critical Errors API Endpoint
 * Provides recent critical errors that need immediate attention
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthUser } from '@/lib/auth'
import { errorTracker } from '@/lib/monitoring/error-tracker'
import { z } from 'zod'

const criticalQuerySchema = z.object({
  hours: z.string().optional().default('24')
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
    const queryValidation = criticalQuerySchema.safeParse({
      hours: searchParams.get('hours') || '24'
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      )
    }

    const { hours } = queryValidation.data
    const hoursNumber = parseInt(hours, 10)

    if (isNaN(hoursNumber) || hoursNumber < 1 || hoursNumber > 168) {
      return NextResponse.json(
        { success: false, error: 'Hours parameter must be between 1 and 168 (7 days)' },
        { status: 400 }
      )
    }

    // 3. Get critical errors
    const criticalErrors = await errorTracker.getCriticalErrors(hoursNumber)

    return NextResponse.json({
      success: true,
      data: {
        errors: criticalErrors,
        count: criticalErrors.length,
        timeframe: `${hoursNumber} hours`,
        hasAlerts: criticalErrors.length > 0
      }
    })

  } catch (error) {
    console.error('Error getting critical errors:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}