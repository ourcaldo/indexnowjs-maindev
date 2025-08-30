import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Fetch site settings for public consumption
    const { data: settings, error } = await supabaseAdmin
      .from('indb_site_settings')
      .select(`
        site_name,
        site_description,
        site_logo_url,
        site_icon_url,
        site_favicon_url,
        contact_email,
        support_email,
        maintenance_mode,
        registration_enabled
      `)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching public site settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch site settings' },
        { status: 500 }
      )
    }

    // Return default public settings if none exist
    if (!settings) {
      return NextResponse.json({
        site_name: 'IndexNow Studio',
        site_description: 'Professional Google Indexing Tool',
        site_logo_url: null,
        site_icon_url: null,
        site_favicon_url: null,
        contact_email: 'contact@indexnow.studio',
        support_email: 'support@indexnow.studio',
        maintenance_mode: false,
        registration_enabled: true
      })
    }

    // Return only public fields (no SMTP credentials or sensitive data)
    return NextResponse.json({
      site_name: settings.site_name,
      site_description: settings.site_description,
      site_logo_url: settings.site_logo_url,
      site_icon_url: settings.site_icon_url,
      site_favicon_url: settings.site_favicon_url,
      contact_email: settings.contact_email,
      support_email: settings.support_email,
      maintenance_mode: settings.maintenance_mode,
      registration_enabled: settings.registration_enabled
    })

  } catch (error) {
    console.error('Public site settings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}