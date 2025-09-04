import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Page slug is required' },
        { status: 400 }
      )
    }
    
    // Fetch the page with author information
    const { data: page, error: pageError } = await supabaseAdmin
      .from('indb_cms_pages')
      .select(`
        id,
        title,
        slug,
        content,
        template,
        featured_image_url,
        meta_title,
        meta_description,
        custom_css,
        custom_js,
        published_at,
        author_id
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .single()
    
    if (pageError || !page) {
      if (pageError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Page not found' },
          { status: 404 }
        )
      }
      
      console.error('Failed to fetch page:', pageError)
      return NextResponse.json(
        { error: 'Failed to fetch page' },
        { status: 500 }
      )
    }
    
    // Fetch author information
    let authorName = 'Unknown'
    if (page.author_id) {
      const { data: author } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('user_id, full_name')
        .eq('user_id', page.author_id)
        .single()
      
      if (author?.full_name) {
        authorName = author.full_name
      }
    }

    // Transform the page data for public consumption
    const publicPage = {
      id: page.id,
      title: page.title,
      slug: page.slug,
      content: page.content || '',
      template: page.template,
      featured_image_url: page.featured_image_url,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      custom_css: page.custom_css,
      custom_js: page.custom_js,
      published_at: page.published_at,
      author_name: authorName
    }

    return NextResponse.json({ page: publicPage })
    
  } catch (error) {
    console.error('Public page fetch API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}