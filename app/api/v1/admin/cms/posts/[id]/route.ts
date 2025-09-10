import { NextRequest, NextResponse } from 'next/server'
import { requireServerSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireServerSuperAdminAuth(request)
    const { id } = await params

    const { data: post, error } = await supabaseAdmin
      .from('indb_cms_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Failed to fetch CMS post:', id, 'error:', error)
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
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
      author_email: authorEmail,
      selectedCategories: post.categories || [], // Array of category IDs from posts table
      mainCategory: post.main_category_id // Main category ID from posts table
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
    const { id } = await params
    
    // Better error handling for JSON parsing
    let body
    try {
      const text = await request.text()
      if (!text || text.trim() === '') {
        return NextResponse.json({ error: 'Request body is empty' }, { status: 400 })
      }
      body = JSON.parse(text)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

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
    // Handle multiple categories - store directly in cms_posts table
    if (body.selectedCategories !== undefined) {
      updateData.categories = body.selectedCategories // Array of category IDs stored in posts table
    }
    
    if (body.mainCategory !== undefined) {
      updateData.main_category_id = body.mainCategory
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    const { data: post, error } = await supabaseAdmin
      .from('indb_cms_posts')
      .update(updateData)
      .eq('id', id)
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
    const { id } = await params

    const { data: post, error } = await supabaseAdmin
      .from('indb_cms_posts')
      .delete()
      .eq('id', id)
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