import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'

// GET /api/v1/rank-tracking/domains - Get user's tracked domains
export async function GET(request: NextRequest) {
  try {
    const user = await requireUserAuth(request)
    
    // Fetch user's domains with keyword count
    const { data: domains, error } = await supabaseAdmin
      .from('indb_rank_domains')
      .select(`
        *,
        keywords:indb_rank_keywords(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching domains:', error)
      return NextResponse.json(
        { error: 'Failed to fetch domains' },
        { status: 500 }
      )
    }

    // Process domains to include keyword count
    const processedDomains = (domains || []).map(domain => ({
      ...domain,
      keyword_count: domain.keywords?.[0]?.count || 0,
      keywords: undefined // Remove the count object from response
    }))

    return NextResponse.json({
      success: true,
      domains: processedDomains
    })

  } catch (error: any) {
    console.error('Domains API error:', error)
    
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

// POST /api/v1/rank-tracking/domains - Add new domain for tracking
export async function POST(request: NextRequest) {
  try {
    const user = await requireUserAuth(request)
    const body = await request.json()

    const { domain_name, country_code, description } = body

    // Validate required fields
    if (!domain_name || !country_code) {
      return NextResponse.json(
        { error: 'Missing required fields: domain_name, country_code' },
        { status: 400 }
      )
    }

    // Clean domain name (remove protocol, www, trailing slash)
    const cleanDomain = domain_name
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .toLowerCase()

    // Check if domain already exists for this user
    const { data: existingDomain } = await supabaseAdmin
      .from('indb_rank_domains')
      .select('id')
      .eq('user_id', user.id)
      .eq('domain_name', cleanDomain)
      .eq('country_code', country_code)
      .single()

    if (existingDomain) {
      return NextResponse.json(
        { error: 'Domain already exists for this country' },
        { status: 409 }
      )
    }

    // Insert new domain
    const { data: newDomain, error } = await supabaseAdmin
      .from('indb_rank_domains')
      .insert({
        user_id: user.id,
        domain_name: cleanDomain,
        country_code,
        description: description || '',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating domain:', error)
      return NextResponse.json(
        { error: 'Failed to create domain' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      domain: newDomain,
      message: 'Domain added successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create domain API error:', error)
    
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