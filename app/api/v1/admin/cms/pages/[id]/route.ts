import { NextRequest, NextResponse } from 'next/server'
import { requireServerSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'
import { PageFormSchema, sanitizeContent, sanitizeCustomCSS, sanitizeCustomJS } from '@/lib/cms/pageValidation'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireServerSuperAdminAuth(request)
    const { id } = await params

    const { data: page, error } = await supabaseAdmin
      .from('indb_cms_pages')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Failed to fetch page:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 })
    }

    // Get author information
    let authorName = 'Unknown'
    let authorEmail = 'Unknown'
    
    if (page.author_id) {
      const { data: authorProfile, error: profileError } = await supabaseAdmin
        .from('indb_auth_user_profiles')
        .select('full_name, user_id')
        .eq('user_id', page.author_id)
        .single()

      if (!profileError && authorProfile) {
        authorName = authorProfile.full_name || 'Unknown'
        try {
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(authorProfile.user_id)
          if (!authError && authUser?.user) {
            authorEmail = authUser.user.email || 'Unknown'
          }
        } catch (authFetchError) {
          console.error(`Failed to fetch auth data for author ${page.author_id}:`, authFetchError)
        }
      }
    }

    const pageWithAuthor = {
      ...page,
      author_name: authorName,
      author_email: authorEmail
    }

    return NextResponse.json({ page: pageWithAuthor })
  } catch (error) {
    console.error('CMS page fetch API error:', error)
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
    
    // Parse and validate request body
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

    // Check if page exists
    const { data: existingPage, error: fetchError } = await supabaseAdmin
      .from('indb_cms_pages')
      .select('id, slug')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Failed to fetch existing page:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 })
    }

    // Build update object with only provided fields
    const updateData: any = {}
    
    if (body.title !== undefined) updateData.title = body.title
    if (body.slug !== undefined) {
      // Check if new slug already exists (excluding current page)
      if (body.slug !== existingPage.slug) {
        const { data: slugConflict, error: slugError } = await supabaseAdmin
          .from('indb_cms_pages')
          .select('id')
          .eq('slug', body.slug)
          .neq('id', id)
          .single()

        if (slugError && slugError.code !== 'PGRST116') {
          console.error('Failed to check slug uniqueness:', slugError)
          return NextResponse.json({ error: 'Failed to validate slug' }, { status: 500 })
        }

        if (slugConflict) {
          return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
        }
      }
      updateData.slug = body.slug
    }
    
    if (body.content !== undefined) {
      updateData.content = body.content ? sanitizeContent(body.content) : null
    }
    if (body.featured_image_url !== undefined) updateData.featured_image_url = body.featured_image_url || null
    
    if (body.status !== undefined) {
      updateData.status = body.status
      // Auto-set published_at when status changes to published
      if (body.status === 'published') {
        updateData.published_at = new Date().toISOString()
      } else if (body.status === 'draft' || body.status === 'archived') {
        updateData.published_at = null
      }
    }
    
    // Removed homepage functionality
    
    if (body.meta_title !== undefined) updateData.meta_title = body.meta_title || null
    if (body.meta_description !== undefined) updateData.meta_description = body.meta_description || null
    
    if (body.custom_css !== undefined) {
      updateData.custom_css = body.custom_css ? sanitizeCustomCSS(body.custom_css) : null
    }
    if (body.custom_js !== undefined) {
      updateData.custom_js = body.custom_js ? sanitizeCustomJS(body.custom_js) : null
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    const { data: page, error } = await supabaseAdmin
      .from('indb_cms_pages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update page:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to update page' }, { status: 500 })
    }

    return NextResponse.json({ 
      page,
      message: 'Page updated successfully' 
    })
  } catch (error) {
    console.error('CMS page update API error:', error)
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

    // Check if page is currently the homepage
    const { data: pageToDelete, error: fetchError } = await supabaseAdmin
      .from('indb_cms_pages')
      .select('id, title')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Failed to fetch page for deletion:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 })
    }

    // Removed homepage deletion protection

    const { data: page, error } = await supabaseAdmin
      .from('indb_cms_pages')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to delete page:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Page deleted successfully',
      page 
    })
  } catch (error) {
    console.error('CMS page delete API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}