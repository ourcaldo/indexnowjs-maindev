import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  const supabase = supabaseAdmin
  
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const tag = searchParams.get('tag')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    
    const offset = (page - 1) * limit
    
    // Build the query with category names
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
        post_type,
        published_at,
        created_at,
        author_id,
        main_category:main_category_id(id, name, slug)
      `)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Apply tag filter if provided
    if (tag) {
      // Handle both array and text-based tags
      // For JSONB arrays: use containment operator
      // For text fields: convert to text and use ILIKE
      query = query.or(`tags.cs.["${tag}"],tags::text.ilike.%${tag}%`)
    }
    
    // Apply category filter if provided (support both old and new category system)
    if (category) {
      // First try new category system by slug
      const { data: categoryData } = await supabase
        .from('indb_cms_categories')
        .select('id')
        .eq('slug', category)
        .single()
      
      if (categoryData) {
        query = query.eq('main_category_id', categoryData.id)
      } else {
        // Fallback to old category system
        query = query.eq('category', category)
      }
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
    
    // Get total count for pagination with same filters
    let totalQuery = supabase
      .from('indb_cms_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .not('published_at', 'is', null)
    
    // Apply same filters to total count
    if (tag) {
      // Handle both array and text-based tags
      // For JSONB arrays: use containment operator
      // For text fields: convert to text and use ILIKE
      totalQuery = totalQuery.or(`tags.cs.["${tag}"],tags::text.ilike.%${tag}%`)
    }
    
    if (category) {
      // First try new category system by slug
      const { data: categoryData } = await supabase
        .from('indb_cms_categories')
        .select('id')
        .eq('slug', category)
        .single()
      
      if (categoryData) {
        totalQuery = totalQuery.eq('main_category_id', categoryData.id)
      } else {
        // Fallback to old category system
        totalQuery = totalQuery.eq('category', category)
      }
    }
    
    if (search) {
      totalQuery = totalQuery.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
    }
    
    const { count: totalCount } = await totalQuery
    
    const totalPages = Math.ceil((totalCount || 0) / limit)
    
    // Fetch author information for posts
    const authorIds = posts?.map(post => post.author_id).filter(Boolean) || []
    let authorsMap: Record<string, any> = {}
    
    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from('indb_auth_user_profiles')
        .select('user_id, full_name, email')
        .in('user_id', authorIds)
      
      if (authors) {
        authorsMap = authors.reduce((map, author) => {
          map[author.user_id] = author
          return map
        }, {} as Record<string, any>)
      }
    }
    
    // Transform the data to include author and category information
    const transformedPosts = posts?.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || post.content?.substring(0, 200) + '...',
      featured_image_url: post.featured_image_url,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      tags: post.tags || [],
      category: (post as any).main_category?.slug || post.category || 'uncategorized',
      category_name: (post as any).main_category?.name || (post.category !== 'uncategorized' ? post.category.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Uncategorized'),
      post_type: post.post_type || 'post',
      published_at: post.published_at,
      created_at: post.created_at,
      author: {
        name: authorsMap[post.author_id]?.full_name || 'IndexNow Studio Team',
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
        category: category || null,
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