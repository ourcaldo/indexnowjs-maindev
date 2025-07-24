import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperAdminAuth, adminAuthService } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    await requireSuperAdminAuth()

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
    const adminUser = await requireSuperAdminAuth()

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
    await adminAuthService.logAdminActivity(
      'system_settings',
      'Updated site settings',
      'site_settings',
      settings.id,
      { 
        changes: Object.keys(body).filter(key => key !== 'id'),
        site_name 
      }
    )

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