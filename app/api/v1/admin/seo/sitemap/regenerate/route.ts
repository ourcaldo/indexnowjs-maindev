import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminAuth } from '@/lib/auth'
import { revalidateTag, revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    // Verify super admin authentication
    await requireSuperAdminAuth(request)

    const { type } = await request.json()

    // Revalidate specific sitemap or all sitemaps
    if (type && ['posts', 'categories', 'tags', 'pages'].includes(type)) {
      // Revalidate specific sitemap
      revalidatePath(`/sitemap-${type}.xml`)
      console.log(`[SITEMAP] Force regenerated: ${type} sitemap`)
    } else {
      // Revalidate all sitemaps
      revalidatePath('/sitemap.xml')
      revalidatePath('/sitemap-posts.xml')
      revalidatePath('/sitemap-categories.xml')
      revalidatePath('/sitemap-tags.xml')
      revalidatePath('/sitemap-pages.xml')
      console.log('[SITEMAP] Force regenerated: all sitemaps')
    }

    return NextResponse.json({
      success: true,
      message: type ? `${type} sitemap regenerated` : 'All sitemaps regenerated',
      timestamp: Date.now()
    })

  } catch (error: any) {
    console.error('Sitemap regeneration API error:', error)
    
    if (error.message === 'Super admin access required') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to regenerate sitemaps' },
      { status: 500 }
    )
  }
}