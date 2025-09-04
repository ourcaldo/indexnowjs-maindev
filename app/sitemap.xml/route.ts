import { NextRequest, NextResponse } from 'next/server'
import { SitemapGenerator } from '@/lib/services/sitemap/SitemapGenerator'

export async function GET(request: NextRequest) {
  try {
    // Get the current domain from the request
    const host = request.headers.get('host') || 'indexnow.studio'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    
    const generator = new SitemapGenerator(baseUrl)
    const sitemap = await generator.generateMainSitemap()

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error generating main sitemap:', error)
    
    // Return empty sitemap on error
    const emptySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</sitemapindex>`
    
    return new NextResponse(emptySitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600', // Shorter cache on errors
      },
    })
  }
}

// ISR configuration
export const revalidate = 3600 // 1 hour