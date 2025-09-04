import { NextRequest, NextResponse } from 'next/server'
import { SitemapOrchestrator } from '@/lib/services/sitemap/SitemapOrchestrator'

export async function GET(request: NextRequest) {
  try {
    // Get the current domain from the request
    const host = request.headers.get('host') || 'indexnow.studio'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    
    const orchestrator = new SitemapOrchestrator(baseUrl)
    const sitemap = await orchestrator.generateCategoriesSitemap()

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error generating categories sitemap:', error)
    
    // Return empty sitemap on error
    const emptySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`
    
    return new NextResponse(emptySitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  }
}

export const revalidate = 3600 // 1 hour