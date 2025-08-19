import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdminAuth } from '@/lib/admin-auth'
import { ActivityLogger, ActivityEventTypes } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    const authResult = await requireSuperAdminAuth(request)
    
    // Log admin settings access
    if (authResult?.id) {
      try {
        await ActivityLogger.logAdminSettingsActivity(
          authResult.id,
          ActivityEventTypes.SETTINGS_VIEW,
          'Accessed email settings configuration',
          request,
          {
            section: 'email_settings',
            action: 'view_settings',
            adminEmail: authResult.email
          }
        )
      } catch (logError) {
        console.error('Failed to log admin settings activity:', logError)
      }
    }

    // Fetch email settings
    const { data: settings, error } = await supabaseAdmin
      .from('indb_system_smtp_settings')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching email settings:', error)
      
      // Return default settings if none exist
      const defaultSettings = {
        id: 'default',
        smtp_host: '',
        smtp_port: 465,
        smtp_user: '',
        smtp_pass: '',
        smtp_from_name: 'IndexNow Pro',
        smtp_from_email: '',
        smtp_secure: true,
        smtp_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      return NextResponse.json({ 
        success: true, 
        settings: defaultSettings
      })
    }

    return NextResponse.json({ 
      success: true, 
      settings 
    })

  } catch (error: any) {
    console.error('Admin email settings API error:', error)
    
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify super admin authentication
    const adminUser = await requireSuperAdminAuth(request)

    const body = await request.json()
    const {
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_pass,
      smtp_from_name,
      smtp_from_email,
      smtp_secure,
      smtp_enabled
    } = body

    // Validate required fields if enabled
    if (smtp_enabled) {
      if (!smtp_host || !smtp_user || !smtp_pass || !smtp_from_email) {
        return NextResponse.json(
          { error: 'All SMTP fields are required when email is enabled' },
          { status: 400 }
        )
      }
    }

    // Check if settings exist
    const { data: existingSettings } = await supabaseAdmin
      .from('indb_system_smtp_settings')
      .select('id')
      .single()

    let settings
    if (existingSettings) {
      // Update existing settings
      const { data, error } = await supabaseAdmin
        .from('indb_system_smtp_settings')
        .update({
          smtp_host,
          smtp_port: parseInt(smtp_port),
          smtp_user,
          smtp_pass,
          smtp_from_name,
          smtp_from_email,
          smtp_secure,
          smtp_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSettings.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating email settings:', error)
        return NextResponse.json(
          { error: 'Failed to update email settings' },
          { status: 500 }
        )
      }
      settings = data
    } else {
      // Create new settings
      const { data, error } = await supabaseAdmin
        .from('indb_system_smtp_settings')
        .insert({
          smtp_host,
          smtp_port: parseInt(smtp_port),
          smtp_user,
          smtp_pass,
          smtp_from_name,
          smtp_from_email,
          smtp_secure,
          smtp_enabled
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating email settings:', error)
        return NextResponse.json(
          { error: 'Failed to create email settings' },
          { status: 500 }
        )
      }
      settings = data
    }

    // Log email settings update
    if (adminUser?.id) {
      try {
        await ActivityLogger.logAdminSettingsActivity(
          adminUser.id,
          ActivityEventTypes.SITE_SETTINGS_UPDATE,
          'Updated email settings configuration',
          request,
          {
            section: 'email_settings',
            action: 'update_settings',
            adminEmail: adminUser.email,
            smtpHost: smtp_host,
            smtpEnabled: smtp_enabled
          }
        )
      } catch (logError) {
        console.error('Failed to log email settings update activity:', logError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      settings 
    })

  } catch (error: any) {
    console.error('Admin email settings update API error:', error)
    
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}