import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  try {
    const { slug } = params
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Post slug is required' },
        { status: 400 }
      )
    }
    
    // Fetch the main post
    const { data: post, error: postError } = await supabase
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
        updated_at,
        author_id
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .eq('post_type', 'post')
      .not('published_at', 'is', null)
      .single()
    
    if (postError || !post) {
      if (postError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        )
      }
      
      console.error('Failed to fetch post:', postError)
      return NextResponse.json(
        { error: 'Failed to fetch post' },
        { status: 500 }
      )
    }
    
    // Fetch related posts (same tags, excluding current post)
    const { data: relatedPosts } = await supabase
      .from('indb_cms_posts')
      .select(`
        id,
        title,
        slug,
        excerpt,
        featured_image_url,
        tags,
        published_at
      `)
      .eq('status', 'published')
      .eq('post_type', 'post')
      .not('published_at', 'is', null)
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(3)
    
    // Transform the main post data
    const transformedPost = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content || '',
      excerpt: post.excerpt,
      featured_image_url: post.featured_image_url,
      meta_title: post.meta_title || post.title,
      meta_description: post.meta_description || post.excerpt,
      tags: post.tags || [],
      published_at: post.published_at,
      created_at: post.created_at,
      updated_at: post.updated_at,
      author: {
        name: 'IndexNow Studio Team',
        avatar_url: null
      }
    }
    
    // Transform related posts
    const transformedRelatedPosts = relatedPosts?.map(relatedPost => ({
      id: relatedPost.id,
      title: relatedPost.title,
      slug: relatedPost.slug,
      excerpt: relatedPost.excerpt || '',
      featured_image_url: relatedPost.featured_image_url,
      tags: relatedPost.tags || [],
      published_at: relatedPost.published_at,
      author: {
        name: 'IndexNow Studio Team'
      }
    })) || []
    
    return NextResponse.json({
      post: transformedPost,
      related_posts: transformedRelatedPosts
    })
    
  } catch (error) {
    console.error('System error in single post API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}