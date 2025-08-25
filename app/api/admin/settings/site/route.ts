import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { requireSuperAdminAuth } from '@/lib/auth'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    const authResult = await requireSuperAdminAuth(request)
    
    // Log admin settings access
    if (authResult?.id) {
      try {
        await ActivityLogger.logAdminSettingsActivity(
          authResult.id,
          ActivityEventTypes.SITE_SETTINGS_VIEW,
          'Accessed site settings configuration',
          request,
          {
            section: 'site_settings',
            action: 'view_settings',
            adminEmail: authResult.email
          }
        )
      } catch (logError) {
        console.error('Failed to log admin settings activity:', logError)
      }
    }

    // Fetch site settings
    const { data: settings, error } = await supabaseAdmin
      .from('indb_site_settings')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching site settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch site settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      settings 
    })

  } catch (error: any) {
    console.error('Admin site settings API error:', error)
    
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
      site_name,
      site_description,
      site_logo_url,
      site_icon_url,
      site_favicon_url,
      contact_email,
      support_email,
      maintenance_mode,
      registration_enabled
    } = body

    // Update site settings
    const { data: settings, error } = await supabaseAdmin
      .from('indb_site_settings')
      .update({
        site_name,
        site_description,
        site_logo_url,
        site_icon_url,
        site_favicon_url,
        contact_email,
        support_email,
        maintenance_mode,
        registration_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating site settings:', error)
      return NextResponse.json(
        { error: 'Failed to update site settings' },
        { status: 500 }
      )
    }

    // Log site settings update
    if (adminUser?.id) {
      try {
        await ActivityLogger.logAdminSettingsActivity(
          adminUser.id,
          ActivityEventTypes.SITE_SETTINGS_UPDATE,
          'Updated site settings configuration',
          request,
          {
            section: 'site_settings',
            action: 'update_settings',
            adminEmail: adminUser.email,
            updatedFields: Object.keys(body).filter(key => key !== 'id').join(', '),
            siteName: site_name
          }
        )
      } catch (logError) {
        console.error('Failed to log site settings update activity:', logError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      settings 
    })

  } catch (error: any) {
    console.error('Admin site settings update API error:', error)
    
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