import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { updateUserSettingsSchema } from '@/shared/schema'

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get user settings using admin client
    const { data: settings, error: settingsError } = await supabaseAdmin!
      .from('indb_auth_user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settingsError) {
      // If settings don't exist, create default settings
      if (settingsError.code === 'PGRST116') {
        const { data: newSettings, error: createError } = await supabaseAdmin!
          .from('indb_auth_user_settings')
          .insert({
            user_id: user.id,
            timeout_duration: 30000, // 30 seconds
            retry_attempts: 3,
            email_job_completion: true,
            email_job_failure: true,
            email_quota_alerts: true,
            default_schedule: 'one-time',
            email_daily_report: true,
          })
          .select()
          .single()

        if (createError) {
          return NextResponse.json(
            { error: 'Failed to create default settings' },
            { status: 500 }
          )
        }

        return NextResponse.json({ settings: newSettings })
      }

      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings })

  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const authorization = request.headers.get('authorization')
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Validate input
    const result = updateUserSettingsSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.errors },
        { status: 400 }
      )
    }

    // Update user settings using admin client
    const { data: settings, error: updateError } = await supabaseAdmin!
      .from('indb_auth_user_settings')
      .update(result.data)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      settings,
      message: 'Settings updated successfully',
    })

  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}