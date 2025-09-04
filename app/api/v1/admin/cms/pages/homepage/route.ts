import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireServerSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'
import { HomepageUpdateSchema } from '@/lib/cms/pageValidation'

export async function GET(request: NextRequest) {
  try {
    await requireServerSuperAdminAuth(request)

    // Get current homepage
    const { data: homepage, error } = await supabaseAdmin
      .from('indb_cms_pages')
      .select('id, title, slug, status, published_at')
      .eq('is_homepage', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch homepage:', error)
      return NextResponse.json({ error: 'Failed to fetch homepage settings' }, { status: 500 })
    }

    const homepageSettings = {
      current_homepage_id: homepage?.id || null,
      current_homepage_slug: homepage?.slug || null,
      current_homepage_title: homepage?.title || null,
      is_custom_homepage: !!homepage,
      homepage_status: homepage?.status || null,
      homepage_published: homepage?.published_at ? true : false
    }

    return NextResponse.json({ homepage: homepageSettings })
  } catch (error) {
    console.error('Homepage settings API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireServerSuperAdminAuth(request)
    
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

    // Validate request body against schema
    const validationResult = HomepageUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      return NextResponse.json({ 
        error: 'Validation failed',
        details: errors 
      }, { status: 400 })
    }

    const { page_id } = validationResult.data

    // Check if the page exists and is published
    const { data: targetPage, error: pageError } = await supabaseAdmin
      .from('indb_cms_pages')
      .select('id, title, slug, status, published_at')
      .eq('id', page_id)
      .single()

    if (pageError) {
      console.error('Failed to fetch target page:', pageError)
      if (pageError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch page' }, { status: 500 })
    }

    if (targetPage.status !== 'published' || !targetPage.published_at) {
      return NextResponse.json({ 
        error: 'Only published pages can be set as homepage' 
      }, { status: 400 })
    }

    // Unset current homepage (if any)
    const { error: unsetError } = await supabaseAdmin
      .from('indb_cms_pages')
      .update({ is_homepage: false, updated_at: new Date().toISOString() })
      .eq('is_homepage', true)

    if (unsetError) {
      console.error('Failed to unset current homepage:', unsetError)
      return NextResponse.json({ error: 'Failed to update homepage settings' }, { status: 500 })
    }

    // Set new homepage
    const { data: newHomepage, error: setError } = await supabaseAdmin
      .from('indb_cms_pages')
      .update({ 
        is_homepage: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', page_id)
      .select('id, title, slug, status, published_at')
      .single()

    if (setError) {
      console.error('Failed to set new homepage:', setError)
      return NextResponse.json({ error: 'Failed to set homepage' }, { status: 500 })
    }

    // Revalidate homepage and specific page cache
    try {
      revalidatePath('/')
      revalidatePath(`/${newHomepage.slug}`)
    } catch (revalidationError) {
      console.error('Error revalidating cache:', revalidationError)
      // Continue anyway, don't fail the request
    }

    return NextResponse.json({ 
      message: 'Homepage updated successfully',
      homepage: {
        current_homepage_id: newHomepage.id,
        current_homepage_slug: newHomepage.slug,
        current_homepage_title: newHomepage.title,
        is_custom_homepage: true,
        homepage_status: newHomepage.status,
        homepage_published: true
      }
    })
  } catch (error) {
    console.error('Homepage update API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}

// Remove homepage setting (reset to default)
export async function DELETE(request: NextRequest) {
  try {
    await requireServerSuperAdminAuth(request)

    // Unset all homepage flags
    const { error } = await supabaseAdmin
      .from('indb_cms_pages')
      .update({ 
        is_homepage: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('is_homepage', true)

    if (error) {
      console.error('Failed to remove homepage setting:', error)
      return NextResponse.json({ error: 'Failed to remove homepage setting' }, { status: 500 })
    }

    // Revalidate homepage cache
    try {
      revalidatePath('/')
    } catch (revalidationError) {
      console.error('Error revalidating homepage cache:', revalidationError)
      // Continue anyway, don't fail the request
    }

    return NextResponse.json({ 
      message: 'Homepage setting removed successfully. Site will use default homepage.',
      homepage: {
        current_homepage_id: null,
        current_homepage_slug: null,
        current_homepage_title: null,
        is_custom_homepage: false,
        homepage_status: null,
        homepage_published: false
      }
    })
  } catch (error) {
    console.error('Homepage removal API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}