import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Execute both queries in parallel for better performance
    const [settingsResult, packagesResult] = await Promise.all([
      // Site Settings
      supabaseAdmin
        .from('indb_site_settings')
        .select(`
          site_name,
          site_tagline,
          site_description,
          site_logo_url,
          white_logo,
          site_icon_url,
          site_favicon_url,
          contact_email,
          support_email,
          maintenance_mode,
          registration_enabled
        `)
        .single(),

      // Public Packages
      supabaseAdmin
        .from('indb_payment_packages')
        .select(`
          id,
          name,
          slug,
          description,
          currency,
          billing_period,
          features,
          quota_limits,
          pricing_tiers,
          is_active,
          sort_order
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
    ])

    // Process Site Settings
    let siteSettings = null
    if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
      console.error('Error fetching public site settings:', settingsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch site settings' },
        { status: 500 }
      )
    }

    // Return default public settings if none exist
    if (!settingsResult.data) {
      siteSettings = {
        site_name: 'IndexNow Studio',
        site_tagline: 'Rank Tracking Made Simple for Smarter SEO Decisions',
        site_description: 'Professional Google Indexing Tool',
        site_logo_url: null,
        white_logo: 'https://bwkasvyrzbzhcdtvsbyg.supabase.co/storage/v1/object/public/indexnow-bucket/logo/IndexNow.png',
        site_icon_url: null,
        site_favicon_url: null,
        contact_email: 'contact@indexnow.studio',
        support_email: 'support@indexnow.studio',
        maintenance_mode: false,
        registration_enabled: true
      }
    } else {
      // Return only public fields (no SMTP credentials or sensitive data)
      siteSettings = {
        site_name: settingsResult.data.site_name,
        site_tagline: settingsResult.data.site_tagline,
        site_description: settingsResult.data.site_description,
        site_logo_url: settingsResult.data.site_logo_url,
        white_logo: settingsResult.data.white_logo,
        site_icon_url: settingsResult.data.site_icon_url,
        site_favicon_url: settingsResult.data.site_favicon_url,
        contact_email: settingsResult.data.contact_email,
        support_email: settingsResult.data.support_email,
        maintenance_mode: settingsResult.data.maintenance_mode,
        registration_enabled: settingsResult.data.registration_enabled
      }
    }

    // Process Packages
    let packages = []
    if (packagesResult.error) {
      console.error('Error fetching public packages:', packagesResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch packages' },
        { status: 500 }
      )
    }

    // Format packages for public consumption (remove sensitive data if any)
    packages = packagesResult.data?.map(pkg => ({
      ...pkg,
      // Ensure pricing tiers are properly formatted
      pricing_tiers: pkg.pricing_tiers || {},
      // Ensure quota limits are available
      quota_limits: pkg.quota_limits || {}
    })) || []

    // Build the merged response
    const publicSettings = {
      siteSettings: siteSettings,
      packages: {
        packages: packages,
        count: packages.length
      }
    }

    return NextResponse.json(publicSettings)

  } catch (error) {
    console.error('Public settings merged API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}