/**
 * Quota Health API Endpoint
 * Provides quota health status and monitoring information
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthUser } from '@/lib/auth'
import { quotaMonitor } from '@/lib/monitoring/quota-monitor'

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

    // 2. Check quota health
    const quotaStatus = await quotaMonitor.checkQuotaHealth()

    return NextResponse.json({
      success: true,
      data: quotaStatus
    })

  } catch (error) {
    console.error('Error checking quota health:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}