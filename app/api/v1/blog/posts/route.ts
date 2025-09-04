import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  const supabase = supabaseAdmin
  
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    
    const offset = (page - 1) * limit
    
    // Build the query
    let query = supabase
      .from('indb_cms_posts')
      .select(`
        id,
        title,
        slug,
        content,
        excerpt,
        featured_image_url,
        meta_title,
        meta_description,
        tags,
        category,
        published_at,
        created_at,
        author_id
      `)
      .eq('status', 'published')
      .eq('post_type', 'post')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply tag filter if provided
    if (tag) {
      query = query.contains('tags', [tag])
    }
    
    // Apply search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
    }
    
    const { data: posts, error, count } = await query
    
    if (error) {
      console.error('Failed to fetch blog posts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch blog posts' },
        { status: 500 }
      )
    }
    
    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('indb_cms_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('post_type', 'post')
      .not('published_at', 'is', null)
    
    const totalPages = Math.ceil((totalCount || 0) / limit)
    
    // Transform the data to include author information
    const transformedPosts = posts?.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || post.content?.substring(0, 200) + '...',
      featured_image_url: post.featured_image_url,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      tags: post.tags || [],
      category: post.category || 'uncategorized',
      published_at: post.published_at,
      created_at: post.created_at,
      author: {
        name: 'IndexNow Studio Team',
        avatar_url: null
      }
    })) || []
    
    return NextResponse.json({
      posts: transformedPosts,
      pagination: {
        current_page: page,
        per_page: limit,
        total_posts: totalCount || 0,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      },
      filters: {
        tag: tag || null,
        search: search || null
      }
    })
    
  } catch (error) {
    console.error('System error in blog posts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}