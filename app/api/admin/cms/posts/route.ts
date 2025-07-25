import { NextRequest, NextResponse } from 'next/server'
import { requireServerSuperAdminAuth } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    await requireServerSuperAdminAuth()

    const { data: posts, error } = await supabaseAdmin
      .from('indb_cms_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch posts:', error)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    // Get author information for each post
    const postsWithAuthorData = []
    
    for (const post of posts || []) {
      try {
        let authorName = 'Unknown'
        let authorEmail = 'Unknown'
        
        if (post.author_id) {
          const { data: authorProfile, error: profileError } = await supabaseAdmin
            .from('indb_auth_user_profiles')
            .select('full_name, user_id')
            .eq('user_id', post.author_id)
            .single()

          if (!profileError && authorProfile) {
            authorName = authorProfile.full_name || 'Unknown'
            try {
              const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(authorProfile.user_id)
              if (!authError && authUser?.user) {
                authorEmail = authUser.user.email || 'Unknown'
              }
            } catch (authFetchError) {
              console.error(`Failed to fetch auth data for author ${post.author_id}:`, authFetchError)
            }
          }
        }

        postsWithAuthorData.push({
          ...post,
          author_name: authorName,
          author_email: authorEmail
        })
      } catch (fetchError) {
        console.error(`Failed to fetch author data for post ${post.id}:`, fetchError)
        postsWithAuthorData.push({
          ...post,
          author_name: 'Unknown',
          author_email: 'Unknown'
        })
      }
    }

    return NextResponse.json({ posts: postsWithAuthorData })
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