/**
 * Frontend Activity Logging API Endpoint
 * Receives activity logs from client-side and forwards to ActivityLogger
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ActivityLogger } from '@/lib/monitoring'

interface ActivityLogRequest {
  eventType: string
  actionDescription: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ActivityLogRequest = await request.json()
    const { eventType, actionDescription, targetType, targetId, metadata } = body

    if (!eventType || !actionDescription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Log the activity using ActivityLogger
    const logId = await ActivityLogger.logActivity({
      userId: user.id,
      eventType,
      actionDescription,
      targetType,
      targetId,
      request,
      metadata
    })

    return NextResponse.json({ 
      success: true, 
      logId,
      message: 'Activity logged successfully' 
    })

  } catch (error) {
    console.error('Error logging activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}