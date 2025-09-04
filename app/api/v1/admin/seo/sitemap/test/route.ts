import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/auth'
import { SitemapTestUtils } from '@/lib/services/sitemap/SitemapTestUtils'

export async function POST(request: NextRequest) {
  try {
    // Verify super admin authentication
    await requireSuperAdminAuth(request)

    const { type, baseUrl } = await request.json()

    // Default to current host if no baseUrl provided
    const testBaseUrl = baseUrl || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`

    let results: any

    switch (type) {
      case 'accessibility':
        results = await SitemapTestUtils.testSitemapAccessibility(testBaseUrl)
        break
      
      case 'integration':
        results = await SitemapTestUtils.runIntegrationTests(testBaseUrl)
        break
      
      case 'robots':
        try {
          const robotsResponse = await fetch(`${testBaseUrl}/robots.txt`)
          if (robotsResponse.ok) {
            const robotsContent = await robotsResponse.text()
            results = SitemapTestUtils.validateRobotsTxt(robotsContent)
          } else {
            results = { valid: false, errors: [`Failed to fetch robots.txt: ${robotsResponse.status}`], warnings: [] }
          }
        } catch (error) {
          results = { valid: false, errors: [`Network error: ${error instanceof Error ? error.message : 'Unknown'}`], warnings: [] }
        }
        break
      
      case 'sitemap':
        try {
          const sitemapResponse = await fetch(`${testBaseUrl}/sitemap.xml`)
          if (sitemapResponse.ok) {
            const sitemapContent = await sitemapResponse.text()
            results = SitemapTestUtils.validateSitemapXml(sitemapContent, 'sitemapindex')
          } else {
            results = { valid: false, errors: [`Failed to fetch sitemap.xml: ${sitemapResponse.status}`], warnings: [] }
          }
        } catch (error) {
          results = { valid: false, errors: [`Network error: ${error instanceof Error ? error.message : 'Unknown'}`], warnings: [] }
        }
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use: accessibility, integration, robots, or sitemap' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      type,
      baseUrl: testBaseUrl,
      results,
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('Sitemap test API error:', error)
    
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to run sitemap tests' },
      { status: 500 }
    )
  }
}