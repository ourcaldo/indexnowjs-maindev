import { NextRequest, NextResponse } from 'next/server'
import { requireServerSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'
import { PageFormSchema, sanitizeContent, sanitizeCustomCSS, sanitizeCustomJS } from '@/lib/cms/pageValidation'
import type { PageFilters } from '@/types/pages'

export async function GET(request: NextRequest) {
  try {
    await requireServerSuperAdminAuth(request)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const status = searchParams.get('status') as PageFilters['status'] || 'all'
    const template = searchParams.get('template') as PageFilters['template'] || 'all'
    const search = searchParams.get('search') || ''
    const is_homepage = searchParams.get('is_homepage') === 'true' ? true : 
                       searchParams.get('is_homepage') === 'false' ? false : undefined

    const offset = (page - 1) * limit

    // Build query with filters
    let query = supabaseAdmin
      .from('indb_cms_pages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply template filter
    if (template && template !== 'all') {
      query = query.eq('template', template)
    }

    // Apply homepage filter
    if (is_homepage !== undefined) {
      query = query.eq('is_homepage', is_homepage)
    }

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,meta_title.ilike.%${search}%`)
    }

    const { data: pages, error, count } = await query

    if (error) {
      console.error('Failed to fetch pages:', error)
      return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
    }

    // Get author information for each page
    const pagesWithAuthorData = []
    
    for (const page of pages || []) {
      try {
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

        pagesWithAuthorData.push({
          ...page,
          author_name: authorName,
          author_email: authorEmail
        })
      } catch (fetchError) {
        console.error(`Failed to fetch author data for page ${page.id}:`, fetchError)
        pagesWithAuthorData.push({
          ...page,
          author_name: 'Unknown',
          author_email: 'Unknown'
        })
      }
    }

    return NextResponse.json({ 
      pages: pagesWithAuthorData,
      total: count || 0,
      page,
      limit,
      hasNext: (count || 0) > offset + limit,
      hasPrev: page > 1
    })
  } catch (error) {
    console.error('CMS pages API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireServerSuperAdminAuth(request)
    
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

    // Validate request body against schema
    const validationResult = PageFormSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      return NextResponse.json({ 
        error: 'Validation failed',
        details: errors 
      }, { status: 400 })
    }

    const validatedData = validationResult.data

    // Sanitize content and custom code
    const sanitizedContent = validatedData.content ? sanitizeContent(validatedData.content) : null
    const sanitizedCSS = validatedData.custom_css ? sanitizeCustomCSS(validatedData.custom_css) : null
    const sanitizedJS = validatedData.custom_js ? sanitizeCustomJS(validatedData.custom_js) : null

    // Check if slug already exists
    const { data: existingPage, error: slugCheckError } = await supabaseAdmin
      .from('indb_cms_pages')
      .select('id')
      .eq('slug', validatedData.slug)
      .single()

    if (slugCheckError && slugCheckError.code !== 'PGRST116') {
      console.error('Failed to check slug uniqueness:', slugCheckError)
      return NextResponse.json({ error: 'Failed to validate slug' }, { status: 500 })
    }

    if (existingPage) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 })
    }

    // If setting as homepage, unset other homepage pages
    if (validatedData.is_homepage) {
      await supabaseAdmin
        .from('indb_cms_pages')
        .update({ is_homepage: false })
        .eq('is_homepage', true)
    }

    // Create the page
    const { data: page, error } = await supabaseAdmin
      .from('indb_cms_pages')
      .insert({
        title: validatedData.title,
        slug: validatedData.slug,
        content: sanitizedContent,
        template: validatedData.template,
        featured_image_url: validatedData.featured_image_url || null,
        author_id: adminUser.id,
        status: validatedData.status,
        is_homepage: validatedData.is_homepage,
        meta_title: validatedData.meta_title || null,
        meta_description: validatedData.meta_description || null,
        custom_css: sanitizedCSS,
        custom_js: sanitizedJS,
        published_at: validatedData.status === 'published' ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create page:', error)
      return NextResponse.json({ error: 'Failed to create page' }, { status: 500 })
    }

    return NextResponse.json({ 
      page,
      message: 'Page created successfully' 
    })
  } catch (error) {
    console.error('CMS pages create API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}