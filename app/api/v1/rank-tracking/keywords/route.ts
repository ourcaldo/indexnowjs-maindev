import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/database'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'

// Validation schemas
const addKeywordsSchema = z.object({
  domain_id: z.string().uuid('Invalid domain ID'),
  keywords: z.array(z.string().min(1)).min(1, 'At least one keyword is required'),
  device_type: z.enum(['desktop', 'mobile']).default('desktop'),
  country_id: z.string().uuid('Invalid country ID'),
  tags: z.array(z.string()).optional().default([])
})

const getKeywordsSchema = z.object({
  domain_id: z.string().uuid().optional(),
  device_type: z.enum(['desktop', 'mobile']).nullable().optional(),
  country_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).default(20)
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
      console.error('Keywords GET: Authentication failed:', authError?.message || 'No user')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Keywords GET: Authenticated user:', user.id)

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = {
      domain_id: url.searchParams.get('domain_id') || undefined,
      device_type: url.searchParams.get('device_type') as 'desktop' | 'mobile' | undefined,
      country_id: url.searchParams.get('country_id') || undefined,
      tags: url.searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '20')
    }

    const validation = getKeywordsSchema.safeParse(queryParams)
    if (!validation.success) {
      console.error('Keywords GET: Validation failed:', validation.error.issues)
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { domain_id, device_type, country_id, tags, page, limit } = validation.data
    const offset = (page - 1) * limit

    // Build query
    let query = supabaseAdmin
      .from('indb_keyword_keywords')
      .select(`
        *,
        domain:indb_keyword_domains(id, domain_name, display_name),
        country:indb_keyword_countries(id, name, iso2_code),
        rankings:indb_keyword_rankings(
          position,
          url,
          search_volume,
          check_date,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Apply filters
    if (domain_id) query = query.eq('domain_id', domain_id)
    if (device_type) query = query.eq('device_type', device_type)
    if (country_id) query = query.eq('country_id', country_id)
    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags)
    }

    // Get total count
    const { count } = await supabaseAdmin
      .from('indb_keyword_keywords')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Get paginated results
    const { data: keywords, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching keywords:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch keywords' },
        { status: 500 }
      )
    }

    // Get keyword IDs for position change calculation
    const keywordIds = (keywords || []).map((k: any) => k.id)
    
    // Calculate target dates for position changes
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Format dates as YYYY-MM-DD for database query
    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    const todayStr = formatDate(today)
    const yesterdayStr = formatDate(yesterday)
    const threeDaysAgoStr = formatDate(threeDaysAgo)
    const sevenDaysAgoStr = formatDate(sevenDaysAgo)
    
    // Fetch historical position data from rank history table
    const { data: historicalData } = await supabaseAdmin
      .from('indb_keyword_rank_history')
      .select('keyword_id, position, check_date')
      .in('keyword_id', keywordIds)
      .in('check_date', [yesterdayStr, threeDaysAgoStr, sevenDaysAgoStr])
    
    // Create lookup maps for position changes
    const positionHistory: { [keywordId: string]: { [date: string]: number | null } } = {}
    
    if (historicalData) {
      historicalData.forEach((record: any) => {
        if (!positionHistory[record.keyword_id]) {
          positionHistory[record.keyword_id] = {}
        }
        positionHistory[record.keyword_id][record.check_date] = record.position
      })
    }

    // Process keywords with proper position change calculations
    const processedKeywords = (keywords || []).map((keyword: any) => {
      // Get current ranking data
      const rankings = Array.isArray(keyword.rankings) ? keyword.rankings : 
                      keyword.rankings ? [keyword.rankings] : []
      const currentRanking = rankings.length > 0 ? rankings[0] : null
      
      // Calculate position changes using historical data
      const keywordHistory = positionHistory[keyword.id] || {}
      const currentPosition = currentRanking?.position || null
      
      const get1DChange = () => {
        const yesterdayPosition = keywordHistory[yesterdayStr]
        if (!yesterdayPosition || !currentPosition) return null
        return yesterdayPosition - currentPosition // Positive means improved (lower number)
      }

      const get3DChange = () => {
        const threeDaysAgoPosition = keywordHistory[threeDaysAgoStr]
        if (!threeDaysAgoPosition || !currentPosition) return null
        return threeDaysAgoPosition - currentPosition
      }

      const get7DChange = () => {
        const sevenDaysAgoPosition = keywordHistory[sevenDaysAgoStr]
        if (!sevenDaysAgoPosition || !currentPosition) return null
        return sevenDaysAgoPosition - currentPosition
      }

      return {
        ...keyword,
        current_position: currentPosition,
        current_url: currentRanking?.url || null,
        search_volume: currentRanking?.search_volume || null,
        last_updated: currentRanking?.check_date || null,
        position_1d: get1DChange(),
        position_3d: get3DChange(),
        position_7d: get7DChange(),
        rankings: undefined // Remove full rankings from response
      }
    })

    return NextResponse.json({
      success: true,
      data: processedKeywords,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Keywords GET API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from server context
    const user = await getServerAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const validation = addKeywordsSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { domain_id, keywords, device_type, country_id, tags } = validation.data

    // Verify domain belongs to user
    const { data: domain, error: domainError } = await supabaseAdmin
      .from('indb_keyword_domains')
      .select('id')
      .eq('id', domain_id)
      .eq('user_id', user.id)
      .single()

    if (domainError || !domain) {
      return NextResponse.json(
        { success: false, error: 'Domain not found or access denied' },
        { status: 404 }
      )
    }

    // Check user's keyword quota - first from user profile, then subscription
    const { data: userProfile } = await supabaseAdmin
      .from('indb_auth_user_profiles')
      .select(`
        *,
        package:indb_payment_packages(quota_limits)
      `)
      .eq('user_id', user.id)
      .single()

    // Get current keyword count for user
    const { count: currentKeywordCount } = await supabaseAdmin
      .from('indb_keyword_keywords')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Get quota limits - first check direct package assignment, then active subscription
    let quotaLimits: any = null
    
    if (userProfile?.package_id && userProfile?.package) {
      // User has direct package assignment
      quotaLimits = userProfile.package.quota_limits
    } else {
      // Check active subscription
      const { data: activeSubscriptions } = await supabaseAdmin
        .from('indb_payment_subscriptions')
        .select(`
          package:indb_payment_packages(quota_limits)
        `)
        .eq('user_id', user.id)
        .eq('subscription_status', 'active')
      
      // Get quota_limits from first active subscription
      if (activeSubscriptions && activeSubscriptions.length > 0) {
        const firstSubscription = activeSubscriptions[0] as any
        quotaLimits = firstSubscription?.package?.quota_limits
      }
    }
    
    // Handle unlimited keywords (-1) or default to free tier limit
    let keywordLimit: number
    if (quotaLimits?.keywords_limit === -1) {
      keywordLimit = Infinity // Unlimited
    } else if (quotaLimits?.keywords_limit) {
      keywordLimit = quotaLimits.keywords_limit
    } else {
      keywordLimit = 50 // Default free tier
    }

    // Check quota limit (skip check if unlimited)
    if (keywordLimit !== Infinity && (currentKeywordCount || 0) + keywords.length > keywordLimit) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Adding ${keywords.length} keywords would exceed your limit of ${keywordLimit === Infinity ? 'unlimited' : keywordLimit}. Current usage: ${currentKeywordCount || 0}` 
        },
        { status: 400 }
      )
    }

    // Check for duplicate keywords
    const { data: existingKeywords } = await supabaseAdmin
      .from('indb_keyword_keywords')
      .select('keyword')
      .eq('user_id', user.id)
      .eq('domain_id', domain_id)
      .eq('device_type', device_type)
      .eq('country_id', country_id)
      .in('keyword', keywords)

    const existingKeywordTexts = existingKeywords?.map((k: any) => k.keyword) || []
    const newKeywords = keywords.filter((k: string) => !existingKeywordTexts.includes(k))

    if (newKeywords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'All keywords already exist for this domain/device/country combination' },
        { status: 400 }
      )
    }

    // Create keyword entries
    const keywordEntries = newKeywords.map(keyword => ({
      user_id: user.id,
      domain_id,
      keyword: keyword.trim(),
      device_type,
      country_id,
      tags: tags || []
    }))

    const { data: insertedKeywords, error } = await supabaseAdmin
      .from('indb_keyword_keywords')
      .insert(keywordEntries)
      .select(`
        *,
        domain:indb_keyword_domains(domain_name, display_name),
        country:indb_keyword_countries(name, iso2_code)
      `)

    if (error) {
      console.error('Error inserting keywords:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add keywords' },
        { status: 500 }
      )
    }



    // Trigger immediate rank checks for newly added keywords if user has API key configured
    let hasAPIKey = false
    try {
      const { APIKeyManager } = await import('@/lib/rank-tracking/api-key-manager')
      const { RankTracker } = await import('@/lib/rank-tracking/rank-tracker')
      
      const apiKeyManager = new APIKeyManager()
      const siteAPIKey = await apiKeyManager.getActiveAPIKey()
      hasAPIKey = !!siteAPIKey
      
      if (siteAPIKey && insertedKeywords) {
        const rankTracker = new RankTracker()
        
        // Process each keyword asynchronously (don't wait for completion)
        const rankCheckPromises = insertedKeywords.map(async (keyword: any) => {
          try {
            const keywordData = {
              id: keyword.id,
              keyword: keyword.keyword,
              domain: keyword.domain.domain_name,
              deviceType: keyword.device_type,
              countryCode: keyword.country.iso2_code,
              userId: user.id
            }
            
            await rankTracker.trackKeyword(keywordData)
            console.log(`Rank check completed for keyword: ${keyword.keyword}`)
          } catch (error) {
            console.error(`Rank check failed for keyword ${keyword.keyword}:`, error)
            // Don't throw - let other keywords process
          }
        })
        
        // Start the rank checks but don't wait for them to complete
        // This allows the API to return quickly while processing happens in background
        Promise.allSettled(rankCheckPromises).then(results => {
          const successful = results.filter(r => r.status === 'fulfilled').length
          const failed = results.filter(r => r.status === 'rejected').length
          console.log(`Rank check batch completed: ${successful} successful, ${failed} failed`)
        })
      }
    } catch (error) {
      console.error('Error triggering rank checks:', error)
      // Don't fail the keyword creation if rank checking fails
    }

    return NextResponse.json({
      success: true,
      data: insertedKeywords,
      message: `Successfully added ${newKeywords.length} keywords${existingKeywordTexts.length > 0 ? ` (${existingKeywordTexts.length} duplicates skipped)` : ''}${hasAPIKey ? '. Rank checking started.' : '. Contact admin to configure ScrapingDog API key.'}`
    })

  } catch (error) {
    console.error('Keywords POST API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}