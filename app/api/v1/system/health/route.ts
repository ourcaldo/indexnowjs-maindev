import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const { data: healthCheck, error: dbError } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select('user_id')
      .limit(1)

    if (dbError) {
      console.error('Database health check failed:', dbError)
      return NextResponse.json(
        { 
          status: 'unhealthy',
          database: 'error',
          message: 'Database connection failed',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    // Return health status
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      api_version: 'v1',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { 
        status: 'unhealthy',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}