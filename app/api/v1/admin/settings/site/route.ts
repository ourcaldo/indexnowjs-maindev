import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'
import { requireSuperAdminAuth } from '@/lib/auth'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import { validationMiddleware } from '@/lib/services/validation'
import { apiRequestSchemas } from '@/shared/schema'

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
    // Apply validation middleware
    const { response, validationResult } = await validationMiddleware.validateRequest(request, {
      requireAuth: true,
      requireAdmin: true,
      validateBody: apiRequestSchemas.siteSettingsUpdate,
      sanitizeHtml: true,
      sanitizeUrls: true,
      rateLimitConfig: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 5 // 5 settings updates per minute for admin
      }
    });

    // Return error response if validation failed
    if (response) {
      return response;
    }

    // Get validated request body and admin user
    const adminUser = validationResult.user;
    const validatedBody = validationResult.sanitizedData?.body || {};
    
    // Additional super admin check (stricter than middleware admin check)
    try {
      const authResult = await requireSuperAdminAuth(request);
      // authResult is AdminUser if successful, function throws error if unauthorized
    } catch (authError: any) {
      return NextResponse.json(
        { error: authError.message || 'Super admin access required' },
        { status: 403 }
      );
    }

    const {
      id,
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
      registration_enabled,
      robots_txt_content,
      sitemap_enabled,
      sitemap_posts_enabled,
      sitemap_pages_enabled,
      sitemap_categories_enabled,
      sitemap_tags_enabled,
      sitemap_max_urls_per_file,
      sitemap_change_frequency
    } = validatedBody;

    // Update site settings (singleton record)
    const { data: settings, error } = await supabaseAdmin
      .from('indb_site_settings')
      .update({
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
        registration_enabled,
        robots_txt_content,
        sitemap_enabled,
        sitemap_posts_enabled,
        sitemap_pages_enabled,
        sitemap_categories_enabled,
        sitemap_tags_enabled,
        sitemap_max_urls_per_file,
        sitemap_change_frequency,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating site settings:', error)
      return NextResponse.json(
        { error: 'Failed to update site settings' },
        { status: 500 }
      )
    }

    // Trigger ISR revalidation if robots.txt was updated
    if (robots_txt_content !== undefined) {
      try {
        await fetch(new URL('/api/revalidate?secret=revalidate-secret&path=/robots.txt', request.url))
      } catch (revalidateError) {
        console.warn('Failed to revalidate robots.txt:', revalidateError)
      }
    }

    // Trigger sitemap revalidation if sitemap settings were updated
    const sitemapFields = ['sitemap_enabled', 'sitemap_posts_enabled', 'sitemap_pages_enabled', 'sitemap_categories_enabled', 'sitemap_tags_enabled', 'sitemap_max_urls_per_file', 'sitemap_change_frequency']
    const sitemapUpdated = sitemapFields.some(field => validatedBody[field] !== undefined)
    
    if (sitemapUpdated) {
      try {
        const sitemapPaths = ['/sitemap.xml', '/sitemap-posts.xml', '/sitemap-pages.xml', '/sitemap-categories.xml', '/sitemap-tags.xml']
        const revalidationPromises = sitemapPaths.map(path =>
          fetch(new URL(`/api/revalidate?secret=revalidate-secret&path=${path}`, request.url))
            .catch(error => console.warn(`Failed to revalidate ${path}:`, error))
        )
        await Promise.all(revalidationPromises)
      } catch (revalidateError) {
        console.warn('Failed to revalidate sitemaps:', revalidateError)
      }
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
            updatedFields: Object.keys(validatedBody).filter(key => key !== 'id').join(', '),
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