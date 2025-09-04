import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const template = searchParams.get('template') || ''
    const search = searchParams.get('search') || ''

    const offset = (page - 1) * limit

    // Build query for published pages only
    let query = supabaseAdmin
      .from('indb_cms_pages')
      .select(`
        id,
        title,
        slug,
        template,
        featured_image_url,
        meta_title,
        meta_description,
        published_at
      `, { count: 'exact' })
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply template filter if provided
    if (template && template !== 'all') {
      query = query.eq('template', template)
    }

    // Apply search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,meta_title.ilike.%${search}%,meta_description.ilike.%${search}%`)
    }

    const { data: pages, error, count } = await query

    if (error) {
      console.error('Failed to fetch public pages:', error)
      return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
    }

    return NextResponse.json({ 
      pages: pages || [],
      total: count || 0,
      page,
      limit,
      hasNext: (count || 0) > offset + limit,
      hasPrev: page > 1
    })
  } catch (error) {
    console.error('Public pages API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}