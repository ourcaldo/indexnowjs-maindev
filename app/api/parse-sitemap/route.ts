import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create client with the user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sitemapUrl } = body

    // Security: Sanitize and validate sitemap URL
    const sanitizeInput = (input: string): string => {
      if (typeof input !== 'string') return ''
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim()
    }

    const validateUrl = (url: string): boolean => {
      try {
        const urlObj = new URL(url)
        return ['http:', 'https:'].includes(urlObj.protocol) && 
               urlObj.hostname.length >= 3 && 
               urlObj.hostname.includes('.')
      } catch {
        return false
      }
    }

    const sanitizedSitemapUrl = sanitizeInput(sitemapUrl)

    if (!sanitizedSitemapUrl) {
      return NextResponse.json({ error: 'Sitemap URL is required' }, { status: 400 })
    }

    if (!validateUrl(sanitizedSitemapUrl)) {
      return NextResponse.json({ error: 'Invalid sitemap URL format' }, { status: 400 })
    }

    // Parse sitemap and extract URLs
    const urls = await parseSitemapRecursively(sanitizedSitemapUrl)

    return NextResponse.json({ urls, count: urls.length })
  } catch (error) {
    console.error('Error parsing sitemap:', error)
    return NextResponse.json({ error: 'Failed to parse sitemap' }, { status: 500 })
  }
}

async function parseSitemapRecursively(sitemapUrl: string): Promise<string[]> {
  const urls: string[] = []
  const processedSitemaps = new Set<string>()

  async function parseSitemap(url: string): Promise<void> {
    if (processedSitemaps.has(url)) return
    processedSitemaps.add(url)

    try {
      const response = await fetch(url)
      if (!response.ok) return

      const xml = await response.text()
      
      // Parse XML using basic regex (in production, use a proper XML parser)
      const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g)
      const sitemapMatches = xml.match(/<sitemap>[\s\S]*?<\/sitemap>/g)

      if (urlMatches) {
        for (const match of urlMatches) {
          const extractedUrl = match.replace(/<\/?loc>/g, '').trim()
          if (extractedUrl && !extractedUrl.includes('.xml')) {
            urls.push(extractedUrl)
          }
        }
      }

      if (sitemapMatches) {
        for (const sitemapMatch of sitemapMatches) {
          const locMatch = sitemapMatch.match(/<loc>(.*?)<\/loc>/)
          if (locMatch && locMatch[1]) {
            await parseSitemap(locMatch[1].trim())
          }
        }
      }
    } catch (error) {
      console.error(`Error parsing sitemap ${url}:`, error)
    }
  }

  await parseSitemap(sitemapUrl)
  return [...new Set(urls)] // Remove duplicates
}