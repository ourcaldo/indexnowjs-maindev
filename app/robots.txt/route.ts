import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

// Default robots.txt content as fallback
const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /

# Sitemap
Sitemap: https://indexnow.studio/sitemap.xml

# Disallow admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /backend/

# Allow important directories
Allow: /blog/
Allow: /pricing/
Allow: /contact/
Allow: /faq/

# Crawl delay
Crawl-delay: 1`

export async function GET(request: NextRequest) {
  try {
    // Fetch robots.txt content from site settings
    const { data: settings, error } = await supabaseAdmin
      .from('indb_site_settings')
      .select('robots_txt_content')
      .single()

    let robotsContent = DEFAULT_ROBOTS_TXT

    if (!error && settings?.robots_txt_content) {
      robotsContent = settings.robots_txt_content
    } else if (error) {
      console.warn('Failed to fetch robots.txt from database, using default:', error)
    }

    // Get the current domain from the request
    const host = request.headers.get('host') || 'indexnow.studio'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    
    // Replace placeholder URLs with actual domain
    robotsContent = robotsContent.replace(/https:\/\/indexnow\.studio/g, baseUrl)

    return new NextResponse(robotsContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error serving robots.txt:', error)
    
    // Fallback to default content on any error
    return new NextResponse(DEFAULT_ROBOTS_TXT, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  }
}

// ISR configuration
export const revalidate = 3600 // 1 hour