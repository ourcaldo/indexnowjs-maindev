import { NextRequest, NextResponse } from 'next/server'
import { requireServerSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireServerSuperAdminAuth(request)

    const { data: post, error } = await supabaseAdmin
      .from('indb_cms_posts')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Failed to fetch post:', error)
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Get author information
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

    const postWithAuthor = {
      ...post,
      author_name: authorName,
      author_email: authorEmail
    }

    return NextResponse.json({ post: postWithAuthor })
  } catch (error) {
    console.error('CMS post fetch API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireServerSuperAdminAuth(request)
    const body = await request.json()

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build update object with only provided fields
    const updateData: any = {}
    
    if (body.title !== undefined) updateData.title = body.title
    if (body.slug !== undefined) updateData.slug = body.slug
    if (body.content !== undefined) updateData.content = body.content
    if (body.excerpt !== undefined) updateData.excerpt = body.excerpt
    if (body.featured_image_url !== undefined) updateData.featured_image_url = body.featured_image_url
    if (body.status !== undefined) {
      updateData.status = body.status
      // Auto-set published_at when status changes to published
      if (body.status === 'published') {
        updateData.published_at = new Date().toISOString()
      } else if (body.status === 'draft') {
        updateData.published_at = null
      }
    }
    if (body.post_type !== undefined) updateData.post_type = body.post_type
    if (body.meta_title !== undefined) updateData.meta_title = body.meta_title
    if (body.meta_description !== undefined) updateData.meta_description = body.meta_description
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.category !== undefined) updateData.category = body.category

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    const { data: post, error } = await supabaseAdmin
      .from('indb_cms_posts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update post:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('CMS post update API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireServerSuperAdminAuth(request)

    const { data: post, error } = await supabaseAdmin
      .from('indb_cms_posts')
      .delete()
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to delete post:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Post deleted successfully',
      post 
    })
  } catch (error) {
    console.error('CMS post delete API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}