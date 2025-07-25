import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireServerSuperAdminAuth } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    await requireServerSuperAdminAuth()

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
    const adminUser = await requireServerSuperAdminAuth()

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

    // Log admin activity
    try {
      await supabaseAdmin
        .from('indb_admin_activity_logs')
        .insert({
          admin_id: adminUser.id,
          action_type: 'system_settings',
          action_description: 'Updated site settings',
          target_type: 'site_settings',
          target_id: settings.id,
          metadata: { 
            changes: Object.keys(body).filter(key => key !== 'id'),
            site_name 
          }
        })
    } catch (logError) {
      console.error('Failed to log admin activity:', logError)
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