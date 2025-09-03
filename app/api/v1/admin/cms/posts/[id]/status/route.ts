import { NextRequest, NextResponse } from 'next/server'
import { requireServerSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireServerSuperAdminAuth(request)
    const body = await request.json()

    if (!body.status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    if (!['draft', 'published', 'archived'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    // Build update object for status change
    const updateData: any = {
      status: body.status,
      updated_at: new Date().toISOString()
    }

    // Auto-set published_at when status changes to published
    if (body.status === 'published') {
      updateData.published_at = new Date().toISOString()
    } else if (body.status === 'draft') {
      updateData.published_at = null
    }

    const { data: post, error } = await supabaseAdmin
      .from('indb_cms_posts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update post status:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to update post status' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Post status updated successfully',
      post 
    })
  } catch (error) {
    console.error('CMS post status update API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}