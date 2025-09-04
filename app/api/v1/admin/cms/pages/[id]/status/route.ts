import { NextRequest, NextResponse } from 'next/server'
import { requireServerSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'
import { PageStatusUpdateSchema } from '@/lib/cms/pageValidation'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireServerSuperAdminAuth(request)
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

    // Validate request body against schema
    const validationResult = PageStatusUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      return NextResponse.json({ 
        error: 'Validation failed',
        details: errors 
      }, { status: 400 })
    }

    const { status } = validationResult.data

    // Build update object for status change
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // Auto-set published_at when status changes to published
    if (status === 'published') {
      updateData.published_at = new Date().toISOString()
    } else if (status === 'draft' || status === 'archived') {
      updateData.published_at = null
    }

    const { data: page, error } = await supabaseAdmin
      .from('indb_cms_pages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update page status:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to update page status' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Page status updated successfully',
      page 
    })
  } catch (error) {
    console.error('CMS page status update API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}