import { NextRequest, NextResponse } from 'next/server'
import { requireServerSuperAdminAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    await requireServerSuperAdminAuth(request)
    
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const excludeId = searchParams.get('excludeId')

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    let query = supabaseAdmin
      .from('indb_cms_pages')
      .select('id')
      .eq('slug', slug)

    // Exclude specific page ID when checking for updates
    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to validate slug:', error)
      return NextResponse.json({ error: 'Failed to validate slug' }, { status: 500 })
    }

    const isUnique = !data || data.length === 0

    return NextResponse.json({ isUnique, slug })
  } catch (error) {
    console.error('Page slug validation API error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
}