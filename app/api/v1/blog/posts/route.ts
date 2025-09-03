import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/database/supabase'
import { activityLogger } from '@/lib/monitoring/activity-logger'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  
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
        published_at,
        created_at,
        author_id,
        indb_auth_user_profiles!indb_cms_posts_author_id_fkey(
          full_name,
          avatar_url
        )
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
      await activityLogger.logError(
        'BLOG_API_ERROR',
        `Failed to fetch blog posts: ${error.message}`,
        null,
        'blog-posts-api',
        { page, limit, tag, search, error: error.message }
      )
      
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
      published_at: post.published_at,
      created_at: post.created_at,
      author: {
        name: post.indb_auth_user_profiles?.full_name || 'Anonymous',
        avatar_url: post.indb_auth_user_profiles?.avatar_url
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
    await activityLogger.logError(
      'BLOG_API_SYSTEM_ERROR',
      `System error in blog posts API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      null,
      'blog-posts-api',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}