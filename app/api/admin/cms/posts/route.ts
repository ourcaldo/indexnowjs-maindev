import { NextRequest, NextResponse } from 'next/server'
import { requireServerSuperAdminAuth } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    await requireServerSuperAdminAuth()

    const { data: posts, error } = await supabaseAdmin
      .from('indb_cms_posts')
      .select(`
        *,
        author_name:indb_auth_user_profiles!indb_cms_posts_author_id_fkey(full_name),
        author_email:indb_auth_user_profiles!indb_cms_posts_author_id_fkey(user_id)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch posts:', error)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    // Transform the data to include author information
    const transformedPosts = posts?.map(post => ({
      ...post,
      author_name: post.author_name?.full_name || 'Unknown',
      author_email: post.author_email?.user_id || ''
    })) || []

    return NextResponse.json({ posts: transformedPosts })
  } catch (error) {
    console.error('CMS posts API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireServerSuperAdminAuth()
    const body = await request.json()

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data: post, error } = await supabaseAdmin
      .from('indb_cms_posts')
      .insert({
        title: body.title,
        slug: body.slug,
        content: body.content,
        excerpt: body.excerpt,
        featured_image_url: body.featured_image_url,
        author_id: adminUser.id,
        status: body.status || 'draft',
        post_type: body.post_type || 'post',
        meta_title: body.meta_title,
        meta_description: body.meta_description,
        tags: body.tags || [],
        published_at: body.status === 'published' ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create post:', error)
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('CMS posts create API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}