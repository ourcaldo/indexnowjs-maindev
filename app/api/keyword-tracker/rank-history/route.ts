import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'

// Validation schema
const getRankHistorySchema = z.object({
  domain_id: z.string().uuid().optional(),
  device_type: z.string().optional(),
  country_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().min(1).default(100)
})

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookieHeader = request.headers.get('cookie')
            if (!cookieHeader) return undefined
            
            const cookies = Object.fromEntries(
              cookieHeader.split(';').map(cookie => {
                const [key, value] = cookie.trim().split('=')
                return [key, decodeURIComponent(value || '')]
              })
            )
            return cookies[name]
          },
          set() {},
          remove() {},
        },
      }
    )

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = {
      domain_id: url.searchParams.get('domain_id') || undefined,
      device_type: url.searchParams.get('device_type') || undefined,
      country_id: url.searchParams.get('country_id') || undefined,
      start_date: url.searchParams.get('start_date') || undefined,
      end_date: url.searchParams.get('end_date') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '100')
    }

    const validation = getRankHistorySchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { domain_id, device_type, country_id, start_date, end_date, limit } = validation.data

    // Set default date range (30 days from current date)
    const endDate = end_date || new Date().toISOString().split('T')[0]
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Build query to get rank history data with full keyword details
    let query = supabase
      .from('indb_keyword_rank_history')
      .select(`
        id,
        keyword_id,
        position,
        url,
        search_volume,
        difficulty_score,
        check_date,
        indb_keyword_keywords!inner (
          id,
          keyword,
          device_type,
          user_id,
          domain_id,
          country_id,
          tags,
          indb_keyword_domains!inner (
            id,
            domain_name,
            display_name
          ),
          indb_keyword_countries (
            id,
            name,
            iso2_code,
            iso3_code
          )
        )
      `)
      .eq('indb_keyword_keywords.user_id', user.id)
      .eq('indb_keyword_keywords.is_active', true)
      .gte('check_date', startDate)
      .lte('check_date', endDate)
      .order('check_date', { ascending: false })
      .limit(limit)

    // Add filters if specified
    if (domain_id) {
      query = query.eq('indb_keyword_keywords.domain_id', domain_id)
    }
    if (device_type) {
      query = query.eq('indb_keyword_keywords.device_type', device_type)
    }
    if (country_id) {
      query = query.eq('indb_keyword_keywords.country_id', country_id)
    }

    const { data: rankHistory, error } = await query

    if (error) {
      console.error('Error fetching rank history:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch rank history' },
        { status: 500 }
      )
    }

    // Transform data for easier frontend consumption
    const transformedData = rankHistory?.reduce((acc: any, record: any) => {
      const keywordData = record.indb_keyword_keywords
      const keywordId = keywordData.id
      
      if (!acc[keywordId]) {
        acc[keywordId] = {
          keyword_id: keywordId,
          keyword: keywordData.keyword,
          device_type: keywordData.device_type,
          tags: keywordData.tags || [],
          domain: {
            id: keywordData.indb_keyword_domains.id,
            domain_name: keywordData.indb_keyword_domains.domain_name,
            display_name: keywordData.indb_keyword_domains.display_name
          },
          country: keywordData.indb_keyword_countries,
          history: {}
        }
      }
      
      acc[keywordId].history[record.check_date] = {
        position: record.position,
        url: record.url,
        search_volume: record.search_volume,
        difficulty_score: record.difficulty_score
      }
      
      return acc
    }, {}) || {}

    // Convert to array and sort by keyword
    const results = Object.values(transformedData).sort((a: any, b: any) => 
      a.keyword.localeCompare(b.keyword)
    )

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        start_date: startDate,
        end_date: endDate,
        total_keywords: results.length
      }
    })

  } catch (error) {
    console.error('Rank History API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}