import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

// GET /api/v1/rank-tracking/keywords - Get user's tracked keywords
export async function GET(request: NextRequest) {
  try {
    const user = await requireUserAuth(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const domainId = searchParams.get('domain_id') || ''
    const tag = searchParams.get('tag') || ''
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Build query
    let query = supabaseAdmin
      .from('indb_rank_keywords')
      .select(`
        *,
        domain:indb_rank_domains(
          id,
          domain_name,
          country_code
        ),
        latest_rank:indb_rank_history(
          id,
          rank_position,
          search_url,
          checked_at,
          status
        )
      `)
      .eq('user_id', user.id)

    // Apply filters
    if (search) {
      query = query.ilike('keyword', `%${search}%`)
    }
    
    if (domainId) {
      query = query.eq('domain_id', domainId)
    }
    
    if (tag) {
      query = query.contains('tags', [tag])
    }

    // Apply pagination and ordering
    const { data: keywords, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching keywords:', error)
      return NextResponse.json(
        { error: 'Failed to fetch keywords' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('indb_rank_keywords')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('Error counting keywords:', countError)
    }

    return NextResponse.json({
      success: true,
      keywords: keywords || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error: any) {
    console.error('Keywords API error:', error)
    
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/v1/rank-tracking/keywords - Add new keyword for tracking
export async function POST(request: NextRequest) {
  try {
    const user = await requireUserAuth(request)
    const body = await request.json()

    const { keyword, domain_id, country_code, tags } = body

    // Validate required fields
    if (!keyword || !domain_id || !country_code) {
      return NextResponse.json(
        { error: 'Missing required fields: keyword, domain_id, country_code' },
        { status: 400 }
      )
    }

    // Check if keyword already exists for this domain
    const { data: existingKeyword } = await supabaseAdmin
      .from('indb_rank_keywords')
      .select('id')
      .eq('user_id', user.id)
      .eq('domain_id', domain_id)
      .eq('keyword', keyword)
      .eq('country_code', country_code)
      .single()

    if (existingKeyword) {
      return NextResponse.json(
        { error: 'Keyword already exists for this domain and country' },
        { status: 409 }
      )
    }

    // Insert new keyword
    const { data: newKeyword, error } = await supabaseAdmin
      .from('indb_rank_keywords')
      .insert({
        user_id: user.id,
        domain_id,
        keyword,
        country_code,
        tags: Array.isArray(tags) ? tags : [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating keyword:', error)
      return NextResponse.json(
        { error: 'Failed to create keyword' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      keyword: newKeyword,
      message: 'Keyword added successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create keyword API error:', error)
    
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}