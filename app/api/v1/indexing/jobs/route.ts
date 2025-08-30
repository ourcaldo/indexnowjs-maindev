import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

// GET /api/v1/indexing/jobs - Get user's indexing jobs
export async function GET(request: NextRequest) {
  try {
    const user = await requireUserAuth(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const schedule = searchParams.get('schedule') || ''
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Build query
    let query = supabaseAdmin
      .from('indb_indexing_jobs')
      .select(`
        *,
        service_account:indb_google_service_accounts(
          id,
          name,
          email
        ),
        url_submissions:indb_indexing_url_submissions(
          id,
          url,
          status,
          submitted_at,
          indexed_at,
          error_message
        )
      `)
      .eq('user_id', user.id)

    // Apply filters
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }
    
    if (status && status !== 'All Status') {
      query = query.eq('status', status.toLowerCase())
    }
    
    if (schedule && schedule !== 'All Schedules') {
      query = query.eq('schedule_type', schedule.toLowerCase())
    }

    // Apply pagination and ordering
    const { data: jobs, error } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching jobs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('Error counting jobs:', countError)
    }

    return NextResponse.json({
      success: true,
      jobs: jobs || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error: any) {
    console.error('Jobs API error:', error)
    
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

// POST /api/v1/indexing/jobs - Create new indexing job
export async function POST(request: NextRequest) {
  try {
    const user = await requireUserAuth(request)
    const body = await request.json()

    const { error } = await supabaseAdmin
      .from('indb_indexing_jobs')
      .insert({
        user_id: user.id,
        title: body.title,
        description: body.description,
        urls: body.urls,
        schedule_type: body.schedule_type,
        schedule_config: body.schedule_config,
        service_account_id: body.service_account_id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error creating job:', error)
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Job created successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create job API error:', error)
    
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