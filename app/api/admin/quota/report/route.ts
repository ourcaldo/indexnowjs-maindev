/**
 * Quota Report API Endpoint
 * Generates detailed quota usage reports and analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthUser } from '@/lib/server-auth'
import { quotaMonitor } from '@/lib/quota-monitor'
import { z } from 'zod'

const reportQuerySchema = z.object({
  days: z.string().optional().default('30')
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
    const queryValidation = reportQuerySchema.safeParse({
      days: searchParams.get('days') || '30'
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters' },
        { status: 400 }
      )
    }

    const { days } = queryValidation.data
    const daysNumber = parseInt(days, 10)

    if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
      return NextResponse.json(
        { success: false, error: 'Days parameter must be between 1 and 365' },
        { status: 400 }
      )
    }

    // 3. Generate quota report
    const report = await quotaMonitor.generateQuotaReport(daysNumber)

    return NextResponse.json({
      success: true,
      data: report
    })

  } catch (error) {
    console.error('Error generating quota report:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}