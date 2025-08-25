/**
 * Admin API - Manual Rank Check Trigger
 * Allows admin to manually trigger the daily rank check process
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthUser } from '@/lib/auth'
import { workerStartup } from '@/lib/job-management/worker-startup'
import { dailyRankCheckJob } from '@/lib/rank-tracking/daily-rank-check-job'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate admin user
    const user = await getServerAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin (you might have a different admin check)
    // For now, we'll allow any authenticated user for testing
    
    // 2. Check if workers are initialized
    const workerStatus = workerStartup.getStatus()
    if (!workerStatus.isInitialized) {
      return NextResponse.json(
        { success: false, error: 'Background workers not initialized' },
        { status: 503 }
      )
    }

    // 3. Check if job is already running
    const jobStatus = dailyRankCheckJob.getStatus()
    if (jobStatus.isRunning) {
      return NextResponse.json(
        { success: false, error: 'Rank check job is already running' },
        { status: 409 }
      )
    }

    // 4. Get current stats before starting
    const beforeStats = await dailyRankCheckJob.getStats()

    // 5. Trigger manual rank check
    const startTime = Date.now()
    
    // Don't await - let it run in background
    workerStartup.triggerManualRankCheck().catch(error => {
      console.error('Manual rank check failed:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Manual rank check triggered successfully',
      data: {
        triggeredAt: new Date().toISOString(),
        beforeStats,
        jobStatus: dailyRankCheckJob.getStatus()
      }
    })

  } catch (error) {
    console.error('Failed to trigger manual rank check:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check rank check status
export async function GET(request: NextRequest) {
  try {
    const user = await getServerAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get worker and job status
    const workerStatus = workerStartup.getStatus()
    const stats = await dailyRankCheckJob.getStats()

    return NextResponse.json({
      success: true,
      data: {
        workerStatus,
        currentStats: stats,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error getting rank check status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}