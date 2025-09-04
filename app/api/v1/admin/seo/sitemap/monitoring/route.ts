import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/auth'
import { SitemapMonitor } from '@/lib/services/sitemap/SitemapMonitor'

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    await requireSuperAdminAuth(request)

    // Get monitoring data
    const metrics = SitemapMonitor.getMetrics()
    const errors = SitemapMonitor.getErrors()
    const summary = SitemapMonitor.getPerformanceSummary()

    return NextResponse.json({
      success: true,
      data: {
        summary,
        metrics: metrics.slice(-20), // Last 20 generations
        errors: errors.slice(-10),   // Last 10 errors
        timestamp: Date.now()
      }
    })

  } catch (error: any) {
    console.error('Sitemap monitoring API error:', error)
    
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch sitemap monitoring data' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify super admin authentication
    await requireSuperAdminAuth(request)

    // Clear monitoring history
    SitemapMonitor.clearHistory()

    return NextResponse.json({
      success: true,
      message: 'Monitoring history cleared'
    })

  } catch (error: any) {
    console.error('Clear monitoring history error:', error)
    
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to clear monitoring history' },
      { status: 500 }
    )
  }
}