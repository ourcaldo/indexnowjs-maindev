/**
 * Quota Status API Endpoint
 * Provides detailed status of all API keys and quota usage
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthUser } from '@/lib/auth'
import { quotaMonitor } from '@/lib/quota-monitor'

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

    // 2. Get all quota status
    const allQuotaStatus = await quotaMonitor.getAllQuotaStatus()

    return NextResponse.json({
      success: true,
      data: {
        apiKeys: allQuotaStatus,
        summary: {
          totalKeys: allQuotaStatus.length,
          activeKeys: allQuotaStatus.filter(key => key.isActive).length,
          exhaustedKeys: allQuotaStatus.filter(key => !key.isActive).length,
          totalQuota: allQuotaStatus.reduce((sum, key) => sum + key.quotaLimit, 0),
          usedQuota: allQuotaStatus.reduce((sum, key) => sum + key.quotaUsed, 0),
          availableQuota: allQuotaStatus.reduce((sum, key) => sum + key.quotaRemaining, 0)
        }
      }
    })

  } catch (error) {
    console.error('Error getting quota status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}