import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Fetch site settings (public endpoint - no auth required)
    const { data: settings, error } = await supabaseAdmin
      .from('indb_site_settings')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching site settings:', error)
      // Return default settings if database error
      return NextResponse.json({ 
        success: true, 
        settings: {
          id: '474f9d67-17b5-4e11-9c46-b61614d17a59',
          site_name: 'IndexNow Pro',
          site_description: 'Professional URL indexing automation platform',
          site_logo_url: 'https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/indexnow-black.png',
          site_icon_url: 'https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/indexnow-icon-black.png',
          site_favicon_url: 'https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/IndexNow-icon.png',
          contact_email: 'aldo@indexnow.studio',
          support_email: 'help@indexnow.studio',
          maintenance_mode: false,
          registration_enabled: true,
          created_at: '2025-07-24T18:08:18.048476Z',
          updated_at: '2025-07-25T17:49:10.754Z'
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      settings 
    })

  } catch (error: any) {
    console.error('Site settings API error:', error)
    
    // Return default settings on error
    return NextResponse.json({ 
      success: true, 
      settings: {
        id: '474f9d67-17b5-4e11-9c46-b61614d17a59',
        site_name: 'IndexNow Pro',
        site_description: 'Professional URL indexing automation platform',
        site_logo_url: 'https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/indexnow-black.png',
        site_icon_url: 'https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/indexnow-icon-black.png',
        site_favicon_url: 'https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/IndexNow-icon.png',
        contact_email: 'aldo@indexnow.studio',
        support_email: 'help@indexnow.studio',
        maintenance_mode: false,
        registration_enabled: true,
        created_at: '2025-07-24T18:08:18.048476Z',
        updated_at: '2025-07-25T17:49:10.754Z'
      }
    })
  }
}